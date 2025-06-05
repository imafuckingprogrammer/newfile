import { createClient } from '@/lib/supabase/client'
import { formatBookForDatabase, GoogleBook } from './google-books'
import { 
  validateInput, 
  addBookToLibrarySchema, 
  updateBookStatusSchema, 
  googleBooksIdSchema, 
  userIdSchema,
  createListSchema,
  updateListSchema,
  updateUserProfileSchema,
  searchQuerySchema,
  sanitizeString,
  type DbResult
} from './validation'
import { withDatabaseRetry } from './retry-logic'
import { z } from 'zod'

// Wrapper function for database operations with error handling
async function dbOperation<T>(operation: () => Promise<T>): Promise<DbResult<T>> {
  try {
    const data = await operation()
    return { success: true, data }
  } catch (error) {
    console.error('Database operation failed:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown database error' 
    }
  }
}

export async function cacheBookInDatabase(book: GoogleBook) {
  const supabase = createClient()
  const bookData = formatBookForDatabase(book)
  
  const { data, error } = await supabase
    .from('books')
    .upsert(bookData, { onConflict: 'google_books_id' })
    .select()
    .single()
  
  if (error) {
    console.error('Error caching book:', error)
    throw error
  }
  
  return data
}

export async function addBookToUserLibrary(
  googleBooksId: string, 
  status: 'want_to_read' | 'reading' | 'read',
  rating?: number,
  reviewText?: string
) {
  // Validate input
  const validatedData = validateInput(addBookToLibrarySchema, {
    googleBooksId,
    status,
    rating,
    reviewText
  })

  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')
  
  // Validate user ID
  validateInput(userIdSchema, user.id)

  // Check if book already exists in user's library
  const { data: existingBook } = await supabase
    .from('user_books')
    .select('*')
    .eq('user_id', user.id)
    .eq('google_books_id', validatedData.googleBooksId)
    .single()
  
  if (existingBook) {
    throw new Error('Book already in your library')
  }
  
  // If rating is provided, automatically set status to 'read'
  const finalStatus = validatedData.rating ? 'read' : validatedData.status
  
  const bookData = {
    user_id: user.id,
    google_books_id: validatedData.googleBooksId,
    status: finalStatus,
    rating: validatedData.rating || null,
    review_text: validatedData.reviewText ? sanitizeString(validatedData.reviewText) : null,
    date_started: finalStatus === 'reading' ? new Date().toISOString().split('T')[0] : null,
    date_finished: finalStatus === 'read' ? new Date().toISOString().split('T')[0] : null,
  }
  
  const { data, error } = await supabase
    .from('user_books')
    .insert(bookData)
    .select()
    .single()
  
  if (error) {
    console.error('Error adding book to user library:', error)
    throw error
  }
  
  return data
}

export async function getUserBooks(userId: string, status?: string) {
  return withDatabaseRetry(async () => {
    const supabase = createClient()
    
    let query = supabase
      .from('user_books')
      .select(`
        id,
        status,
        rating,
        review_text,
        date_started,
        date_finished,
        created_at,
        updated_at,
        books (
          google_books_id,
          title,
          authors,
          cover_url,
          description,
          page_count,
          published_date,
          categories
        )
      `)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch user books: ${error.message}`)
    }

    return data || []
  })
}

export async function updateBookStatus(
  googleBooksId: string,
  status: 'want_to_read' | 'reading' | 'read',
  rating?: number,
  reviewText?: string
) {
  // Validate input
  const validatedData = validateInput(updateBookStatusSchema, {
    googleBooksId,
    status,
    rating,
    reviewText
  })

  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')
  
  // Validate user ID
  validateInput(userIdSchema, user.id)

  // If rating is provided, automatically set status to 'read'
  const finalStatus = validatedData.rating ? 'read' : validatedData.status
  
  const updateData: any = {
    status: finalStatus,
    updated_at: new Date().toISOString(),
  }
  
  if (validatedData.rating !== undefined) {
    updateData.rating = validatedData.rating
  }
  
  if (validatedData.reviewText !== undefined) {
    updateData.review_text = validatedData.reviewText ? sanitizeString(validatedData.reviewText) : null
  }
  
  if (finalStatus === 'reading' && !updateData.date_started) {
    updateData.date_started = new Date().toISOString().split('T')[0]
  }
  
  if (finalStatus === 'read') {
    updateData.date_finished = new Date().toISOString().split('T')[0]
  }
  
  const { data, error } = await supabase
    .from('user_books')
    .update(updateData)
    .eq('user_id', user.id)
    .eq('google_books_id', validatedData.googleBooksId)
    .select()
    .single()
  
  if (error) {
    console.error('Error updating book status:', error)
    throw error
  }
  
  return data
}

export async function getUserBookByGoogleId(userId: string, googleBooksId: string) {
  // Validate input
  const validatedUserId = validateInput(userIdSchema, userId)
  const validatedGoogleBooksId = validateInput(googleBooksIdSchema, googleBooksId)

  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('user_books')
    .select('*')
    .eq('user_id', validatedUserId)
    .eq('google_books_id', validatedGoogleBooksId)
    .single()
  
  if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
    console.error('Error fetching user book:', error)
    throw error
  }
  
  return data
}

// Book Details & Reviews Functions

export async function getBookDetails(googleBooksId: string) {
  // Validate input
  const validatedGoogleBooksId = validateInput(googleBooksIdSchema, googleBooksId)

  const supabase = createClient()
  
  // Single query to get book details with reviews and user info in one go
  const { data: reviews, error: reviewsError } = await supabase
    .from('user_books')
    .select(`
      id,
      user_id,
      status,
      rating,
      review_text,
      updated_at,
      users (
        id,
        username,
        display_name,
        avatar_url
      )
    `)
    .eq('google_books_id', validatedGoogleBooksId)
    .not('review_text', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(50) // Limit reviews to prevent performance issues

  if (reviewsError) {
    console.error('Error fetching book reviews:', reviewsError)
    throw reviewsError
  }

  // Single query to get book statistics
  const { data: stats, error: statsError } = await supabase
    .from('user_books')
    .select('status, rating')
    .eq('google_books_id', validatedGoogleBooksId)

  if (statsError) {
    console.error('Error fetching book stats:', statsError)
    throw statsError
  }

  // Calculate statistics in memory instead of multiple queries
  const bookStats = stats || []
  const totalReaders = bookStats.length
  const wantToRead = bookStats.filter(s => s.status === 'want_to_read').length
  const reading = bookStats.filter(s => s.status === 'reading').length
  const read = bookStats.filter(s => s.status === 'read').length
  
  const ratingsWithValues = bookStats.filter(s => s.rating && s.rating > 0)
  const totalRatings = ratingsWithValues.length
  const overallRating = totalRatings > 0 
    ? ratingsWithValues.reduce((sum, s) => sum + s.rating, 0) / totalRatings 
    : 0

  // Get book from our database  
  const { data: book, error: bookError } = await supabase
    .from('books')
    .select('*')
    .eq('google_books_id', validatedGoogleBooksId)
    .single()
  
  if (bookError && bookError.code !== 'PGRST116') {
    console.error('Error fetching book:', bookError)
    throw bookError
  }

  return {
    book: book || null,
    reviews: reviews || [],
    overallRating: Math.round(overallRating * 10) / 10, // Round to 1 decimal
    totalRatings,
    stats: {
      totalReaders,
      wantToRead,
      reading,
      read
    }
  }
}

export async function getUsersWhoReadBook(googleBooksId: string, limit: number = 20) {
  const supabase = createClient()
  
  // Get users who have this book
  const { data: userBooks, error: userBooksError } = await supabase
    .from('user_books')
    .select('user_id, status, rating, updated_at')
    .eq('google_books_id', googleBooksId)
    .order('updated_at', { ascending: false })
    .limit(limit)
  
  if (userBooksError) {
    console.error('Error fetching users who read book:', userBooksError)
    throw userBooksError
  }
  
  if (!userBooks || userBooks.length === 0) {
    return []
  }
  
  // Get user details
  const userIds = [...new Set(userBooks.map(ub => ub.user_id))]
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, username, display_name, avatar_url')
    .in('id', userIds)
  
  if (usersError) {
    console.error('Error fetching user details:', usersError)
    throw usersError
  }
  
  // Combine data
  return userBooks.map(userBook => ({
    ...userBook,
    user: users?.find(user => user.id === userBook.user_id)
  })).filter(item => item.user)
}

// Reading Lists Functions

export async function createReadingList(title: string, description?: string, isPublic: boolean = true) {
  // Validate input
  const validatedData = validateInput(createListSchema, {
    title: sanitizeString(title),
    description: description ? sanitizeString(description) : undefined,
    is_public: isPublic
  })

  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')
  
  // Validate user ID
  validateInput(userIdSchema, user.id)
  
  const { data, error } = await supabase
    .from('lists')
    .insert({
      user_id: user.id,
      title: validatedData.title,
      description: validatedData.description || null,
      is_public: validatedData.is_public
    })
    .select()
    .single()
  
  if (error) {
    console.error('Error creating reading list:', error)
    throw error
  }
  
  return data
}

export async function getUserLists(userId: string) {
  // Validate input
  const validatedUserId = validateInput(userIdSchema, userId)

  const supabase = createClient()
  
  const { data: lists, error: listsError } = await supabase
    .from('lists')
    .select(`
      *,
      list_items (
        id,
        google_books_id,
        position
      )
    `)
    .eq('user_id', validatedUserId)
    .order('created_at', { ascending: false })
  
  if (listsError) {
    console.error('Error fetching user lists:', listsError)
    throw listsError
  }
  
  return lists || []
}

export async function getPublicLists(limit: number = 20) {
  const supabase = createClient()
  
  const { data: lists, error: listsError } = await supabase
    .from('lists')
    .select('*')
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (listsError) {
    console.error('Error fetching public lists:', listsError)
    throw listsError
  }
  
  if (!lists || lists.length === 0) {
    return []
  }
  
  // Get user details and list items
  const userIds = [...new Set(lists.map(list => list.user_id))]
  const listIds = lists.map(list => list.id)
  
  const [usersResult, itemsResult] = await Promise.all([
    supabase.from('users').select('id, username, display_name').in('id', userIds),
    supabase.from('list_items').select('list_id').in('list_id', listIds)
  ])
  
  const users = usersResult.data || []
  const listItems = itemsResult.data || []
  
  return lists.map(list => ({
    ...list,
    users: users.find(user => user.id === list.user_id),
    list_items: listItems.filter(item => item.list_id === list.id)
  }))
}

export async function getListById(listId: string) {
  const supabase = createClient()
  
  const { data: list, error: listError } = await supabase
    .from('lists')
    .select('*')
    .eq('id', listId)
    .single()
  
  if (listError) {
    console.error('Error fetching list:', listError)
    throw listError
  }
  
  // Get list creator details
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, username, display_name, avatar_url')
    .eq('id', list.user_id)
    .single()
  
  if (userError) {
    console.error('Error fetching list creator:', userError)
  }
  
  // Get list items with book details
  const { data: listItems, error: itemsError } = await supabase
    .from('list_items')
    .select('*')
    .eq('list_id', listId)
    .order('position', { ascending: true })
  
  if (itemsError) {
    console.error('Error fetching list items:', itemsError)
    throw itemsError
  }
  
  let itemsWithBooks = []
  if (listItems && listItems.length > 0) {
    // Get book details
    const bookIds = listItems.map(item => item.google_books_id)
    const { data: books, error: booksError } = await supabase
      .from('books')
      .select('*')
      .in('google_books_id', bookIds)
    
    if (!booksError && books) {
      itemsWithBooks = listItems.map(item => ({
        ...item,
        book: books.find(book => book.google_books_id === item.google_books_id)
      })).filter(item => item.book)
    }
  }
  
  return { 
    ...list, 
    user: user || null,
    items: itemsWithBooks 
  }
}

export async function addBookToList(listId: string, googleBooksId: string) {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')
  
  // Check if user owns the list
  const { data: list } = await supabase
    .from('lists')
    .select('user_id')
    .eq('id', listId)
    .single()
  
  if (!list || list.user_id !== user.id) {
    throw new Error('You can only add books to your own lists')
  }
  
  // Check if book is already in the list
  const { data: existingItem } = await supabase
    .from('list_items')
    .select('*')
    .eq('list_id', listId)
    .eq('google_books_id', googleBooksId)
    .single()
  
  if (existingItem) {
    throw new Error('Book is already in this list')
  }
  
  // Get the next position
  const { count } = await supabase
    .from('list_items')
    .select('*', { count: 'exact', head: true })
    .eq('list_id', listId)
  
  const { data, error } = await supabase
    .from('list_items')
    .insert({
      list_id: listId,
      google_books_id: googleBooksId,
      position: (count || 0) + 1
    })
    .select()
    .single()
  
  if (error) {
    console.error('Error adding book to list:', error)
    throw error
  }
  
  return data
}

export async function removeBookFromList(listId: string, googleBooksId: string) {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')
  
  // Check if user owns the list
  const { data: list } = await supabase
    .from('lists')
    .select('user_id')
    .eq('id', listId)
    .single()
  
  if (!list || list.user_id !== user.id) {
    throw new Error('You can only remove books from your own lists')
  }
  
  const { error } = await supabase
    .from('list_items')
    .delete()
    .eq('list_id', listId)
    .eq('google_books_id', googleBooksId)
  
  if (error) {
    console.error('Error removing book from list:', error)
    throw error
  }
  
  return true
}

export async function updateList(listId: string, updates: { title?: string, description?: string, is_public?: boolean }) {
  // Validate input
  const validatedUpdates = validateInput(updateListSchema, {
    title: updates.title ? sanitizeString(updates.title) : undefined,
    description: updates.description ? sanitizeString(updates.description) : undefined,
    is_public: updates.is_public
  })

  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')
  
  // Validate user ID
  validateInput(userIdSchema, user.id)

  const { data, error } = await supabase
    .from('lists')
    .update(validatedUpdates)
    .eq('id', listId)
    .eq('user_id', user.id) // Ensure user can only update their own lists
    .select()
    .single()
  
  if (error) {
    console.error('Error updating list:', error)
    throw error
  }
  
  return data
}

export async function deleteList(listId: string) {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')
  
  const { error } = await supabase
    .from('lists')
    .delete()
    .eq('id', listId)
    .eq('user_id', user.id)
  
  if (error) {
    console.error('Error deleting list:', error)
    throw error
  }
  
  return true
}

// Social Functions

export async function followUser(followingId: string) {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')
  
  if (user.id === followingId) {
    throw new Error('You cannot follow yourself')
  }
  
  // Check if already following
  const { data: existingFollow } = await supabase
    .from('follows')
    .select('*')
    .eq('follower_id', user.id)
    .eq('following_id', followingId)
    .single()
  
  if (existingFollow) {
    throw new Error('You are already following this user')
  }
  
  const { data, error } = await supabase
    .from('follows')
    .insert({
      follower_id: user.id,
      following_id: followingId
    })
    .select()
    .single()
  
  if (error) {
    console.error('Error following user:', error)
    throw error
  }
  
  return data
}

export async function unfollowUser(followingId: string) {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')
  
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', user.id)
    .eq('following_id', followingId)
  
  if (error) {
    console.error('Error unfollowing user:', error)
    throw error
  }
  
  return true
}

export async function getFollowingUsers(userId: string) {
  const supabase = createClient()
  
  const { data: follows, error: followsError } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId)
  
  if (followsError) {
    console.error('Error fetching following users:', followsError)
    throw followsError
  }
  
  if (!follows || follows.length === 0) {
    return []
  }
  
  const userIds = follows.map(f => f.following_id)
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, username, display_name, avatar_url')
    .in('id', userIds)
  
  if (usersError) {
    console.error('Error fetching user details:', usersError)
    throw usersError
  }
  
  return users || []
}

export async function getFollowers(userId: string) {
  const supabase = createClient()
  
  const { data: follows, error: followsError } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('following_id', userId)
  
  if (followsError) {
    console.error('Error fetching followers:', followsError)
    throw followsError
  }
  
  if (!follows || follows.length === 0) {
    return []
  }
  
  const userIds = follows.map(f => f.follower_id)
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, username, display_name, avatar_url')
    .in('id', userIds)
  
  if (usersError) {
    console.error('Error fetching user details:', usersError)
    throw usersError
  }
  
  return users || []
}

export async function getActivityFeed(userId: string, limit: number = 20) {
  const supabase = createClient()
  
  // Get users that the current user follows
  const { data: following } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId)
  
  if (!following || following.length === 0) {
    return []
  }
  
  const followingIds = following.map(f => f.following_id)
  
  // Get recent book activities from followed users
  const { data: userBooks, error: userBooksError } = await supabase
    .from('user_books')
    .select('*')
    .in('user_id', followingIds)
    .order('updated_at', { ascending: false })
    .limit(limit)
  
  if (userBooksError) {
    console.error('Error fetching activity feed:', userBooksError)
    throw userBooksError
  }
  
  if (!userBooks || userBooks.length === 0) {
    return []
  }
  
  // Get user and book details
  const userIds = [...new Set(userBooks.map(ub => ub.user_id))]
  const bookIds = [...new Set(userBooks.map(ub => ub.google_books_id))]
  
  const [usersResult, booksResult] = await Promise.all([
    supabase.from('users').select('id, username, display_name, avatar_url').in('id', userIds),
    supabase.from('books').select('*').in('google_books_id', bookIds)
  ])
  
  const users = usersResult.data || []
  const books = booksResult.data || []
  
  return userBooks.map(userBook => ({
    ...userBook,
    users: users.find(user => user.id === userBook.user_id),
    books: books.find(book => book.google_books_id === userBook.google_books_id)
  })).filter(item => item.users && item.books)
}

export async function getRecentReviews(limit: number = 10, userId?: string) {
  const supabase = createClient()
  
  let userBooks
  
  if (userId) {
    // Get users that the current user follows
    const { data: following } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId)
    
    if (!following || following.length === 0) {
      return []
    }
    
    const followingIds = following.map(f => f.following_id)
    
    // Get reviews only from followed users
    const { data: followedUserBooks, error: userBooksError } = await supabase
      .from('user_books')
      .select('*')
      .in('user_id', followingIds)
      .not('review_text', 'is', null)
      .not('rating', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(limit)
    
    if (userBooksError) {
      console.error('Error fetching recent reviews:', userBooksError)
      throw userBooksError
    }
    
    userBooks = followedUserBooks
  } else {
    // Get all public reviews (for discovery/public pages)
    const { data: allUserBooks, error: userBooksError } = await supabase
      .from('user_books')
      .select('*')
      .not('review_text', 'is', null)
      .not('rating', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(limit)
    
    if (userBooksError) {
      console.error('Error fetching recent reviews:', userBooksError)
      throw userBooksError
    }
    
    userBooks = allUserBooks
  }
  
  if (!userBooks || userBooks.length === 0) {
    return []
  }
  
  // Get user and book details
  const userIds = [...new Set(userBooks.map(ub => ub.user_id))]
  const bookIds = [...new Set(userBooks.map(ub => ub.google_books_id))]
  
  const [usersResult, booksResult] = await Promise.all([
    supabase.from('users').select('id, username, display_name, avatar_url').in('id', userIds),
    supabase.from('books').select('*').in('google_books_id', bookIds)
  ])
  
  const users = usersResult.data || []
  const books = booksResult.data || []
  
  return userBooks.map(userBook => ({
    ...userBook,
    users: users.find(user => user.id === userBook.user_id),
    books: books.find(book => book.google_books_id === userBook.google_books_id)
  })).filter(item => item.users && item.books)
}

export async function searchUsers(
  query: string,
  options: {
    limit?: number
    offset?: number
    filters?: {
      excludeCurrentUser?: boolean
      currentUserId?: string
    }
  } = {}
) {
  return withDatabaseRetry(async () => {
    const { limit = 20, offset = 0, filters } = options
    const supabase = createClient()
    
    // Validate input
    const searchSchema = z.string().min(1).max(100)
    const validatedQuery = validateInput(searchSchema, query)
    
    // Build full-text search query
    let searchQuery = supabase
      .from('users')
      .select(`
        id,
        username,
        display_name,
        avatar_url,
        bio,
        created_at
      `, { count: 'exact' })
    
    // Use full-text search with ranking
    const searchTerm = validatedQuery.trim()
    
    if (searchTerm.length > 0) {
      // Use PostgreSQL full-text search with ranking
      searchQuery = searchQuery
        .or(`
          username.ilike.%${searchTerm}%,
          display_name.ilike.%${searchTerm}%,
          to_tsvector('english', coalesce(username, '') || ' ' || coalesce(display_name, '')).@@.plainto_tsquery('english', '${searchTerm}')
        `)
        .order('ts_rank(to_tsvector(\'english\', coalesce(username, \'\') || \' \' || coalesce(display_name, \'\')), plainto_tsquery(\'english\', \'${searchTerm}\'))', { ascending: false })
    }
    
    // Apply filters
    if (filters?.excludeCurrentUser && filters?.currentUserId) {
      searchQuery = searchQuery.neq('id', filters.currentUserId)
    }
    
    // Apply pagination
    searchQuery = searchQuery.range(offset, offset + limit - 1)
    
    const { data, error, count } = await searchQuery
    
    if (error) {
      throw new Error(`Failed to search users: ${error.message}`)
    }
    
    return {
      users: data || [],
      total: count || 0,
      hasMore: (count || 0) > offset + limit
    }
  })
}

// Analytics Functions

export async function getReadingAnalytics(userId: string) {
  const supabase = createClient()
  
  // Get all user books
  const { data: userBooks, error: userBooksError } = await supabase
    .from('user_books')
    .select('*')
    .eq('user_id', userId)
  
  if (userBooksError) {
    console.error('Error fetching user books for analytics:', userBooksError)
    throw userBooksError
  }
  
  if (!userBooks || userBooks.length === 0) {
    return {
      totalBooks: 0,
      booksRead: 0,
      currentlyReading: 0,
      wantToRead: 0,
      averageRating: 0,
      totalPages: 0,
      readingStreak: 0,
      favoriteGenres: [],
      readingByMonth: [],
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    }
  }
  
  // Get book details for analytics
  const bookIds = [...new Set(userBooks.map(ub => ub.google_books_id))]
  const { data: books, error: booksError } = await supabase
    .from('books')
    .select('*')
    .in('google_books_id', bookIds)
  
  const booksMap = new Map()
  if (!booksError && books) {
    books.forEach(book => booksMap.set(book.google_books_id, book))
  }
  
  // Basic stats
  const totalBooks = userBooks.length
  const booksRead = userBooks.filter(book => book.status === 'read').length
  const currentlyReading = userBooks.filter(book => book.status === 'reading').length
  const wantToRead = userBooks.filter(book => book.status === 'want_to_read').length
  
  // Average rating
  const ratedBooks = userBooks.filter(book => book.rating)
  const averageRating = ratedBooks.length > 0 
    ? ratedBooks.reduce((sum, book) => sum + book.rating, 0) / ratedBooks.length 
    : 0
  
  // Total pages read
  const totalPages = userBooks
    .filter(book => book.status === 'read')
    .reduce((sum, book) => {
      const bookData = booksMap.get(book.google_books_id)
      return sum + (bookData?.page_count || 0)
    }, 0)
  
  // Rating distribution
  const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  ratedBooks.forEach(book => {
    if (book.rating >= 1 && book.rating <= 5) {
      ratingDistribution[book.rating as keyof typeof ratingDistribution]++
    }
  })
  
  // Favorite genres
  const genreCounts: { [key: string]: number } = {}
  userBooks.forEach(book => {
    const bookData = booksMap.get(book.google_books_id)
    if (bookData?.categories) {
      bookData.categories.forEach((genre: string) => {
        genreCounts[genre] = (genreCounts[genre] || 0) + 1
      })
    }
  })
  
  const favoriteGenres = Object.entries(genreCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([genre, count]) => ({ genre, count }))
  
  // Reading by month (last 12 months)
  const readingByMonth = []
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0)
    
    const booksInMonth = userBooks.filter(book => {
      if (book.status !== 'read' || !book.date_finished) return false
      const finishedDate = new Date(book.date_finished)
      return finishedDate >= monthStart && finishedDate <= monthEnd
    }).length
    
    readingByMonth.push({
      month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      books: booksInMonth
    })
  }
  
  // Reading streak (consecutive days with reading activity)
  const readingStreak = calculateReadingStreak(userBooks)
  
  return {
    totalBooks,
    booksRead,
    currentlyReading,
    wantToRead,
    averageRating: Math.round(averageRating * 10) / 10,
    totalPages,
    readingStreak,
    favoriteGenres,
    readingByMonth,
    ratingDistribution
  }
}

function calculateReadingStreak(userBooks: any[]): number {
  // Simple implementation - count consecutive days with book updates
  const dates = userBooks
    .filter(book => book.updated_at)
    .map(book => new Date(book.updated_at).toDateString())
    .sort()
  
  if (dates.length === 0) return 0
  
  const uniqueDates = [...new Set(dates)]
  let streak = 1
  let currentStreak = 1
  
  for (let i = 1; i < uniqueDates.length; i++) {
    const prevDate = new Date(uniqueDates[i - 1])
    const currentDate = new Date(uniqueDates[i])
    const diffDays = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) {
      currentStreak++
      streak = Math.max(streak, currentStreak)
    } else {
      currentStreak = 1
    }
  }
  
  return streak
}

export async function getReadingGoals(userId: string) {
  const supabase = createClient()
  
  // For now, return a simple goal structure
  // In a real app, you'd have a reading_goals table
  const currentYear = new Date().getFullYear()
  const { data: booksThisYear } = await supabase
    .from('user_books')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'read')
    .gte('date_finished', `${currentYear}-01-01`)
    .lte('date_finished', `${currentYear}-12-31`)
  
  return {
    yearlyGoal: 24, // Default goal
    booksRead: booksThisYear?.length || 0,
    progress: Math.round(((booksThisYear?.length || 0) / 24) * 100)
  }
}

// FEATURE: Reading Progress Tracking
// NOTE: This function is disabled because reading_progress column doesn't exist in current schema
/*
export async function updateReadingProgress(googleBooksId: string, progress: number) {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')
  
  const { data, error } = await supabase
    .from('user_books')
    .update({
      reading_progress: Math.max(0, Math.min(100, progress)),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)
    .eq('google_books_id', googleBooksId)
    .select()
    .single()
  
  if (error) {
    console.error('Error updating reading progress:', error)
    throw error
  }
  
  return data
}
*/

// FEATURE: Like/Heart functionality for reviews
// NOTE: These functions are disabled because review_likes table doesn't exist in current schema
/*
export async function likeReview(userBookId: string) {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')
  
  // Check if already liked
  const { data: existingLike } = await supabase
    .from('review_likes')
    .select('*')
    .eq('user_id', user.id)
    .eq('user_book_id', userBookId)
    .single()
  
  if (existingLike) {
    // Unlike
    const { error } = await supabase
      .from('review_likes')
      .delete()
      .eq('user_id', user.id)
      .eq('user_book_id', userBookId)
    
    if (error) {
      console.error('Error unliking review:', error)
      throw error
    }
    
    return { liked: false }
  } else {
    // Like
    const { error } = await supabase
      .from('review_likes')
      .insert({
        user_id: user.id,
        user_book_id: userBookId,
      })
    
    if (error) {
      console.error('Error liking review:', error)
      throw error
    }
    
    return { liked: true }
  }
}

export async function getReviewLikes(userBookId: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('review_likes')
    .select('user_id')
    .eq('user_book_id', userBookId)
  
  if (error) {
    console.error('Error fetching review likes:', error)
    return { count: 0, userLiked: false }
  }
  
  const { data: { user } } = await supabase.auth.getUser()
  const userLiked = user ? data.some(like => like.user_id === user.id) : false
  
  return {
    count: data.length,
    userLiked
  }
}

// FEATURE: Comments system for reviews
export async function addComment(userBookId: string, content: string) {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')
  
  const { data, error } = await supabase
    .from('review_comments')
    .insert({
      user_id: user.id,
      user_book_id: userBookId,
      content: content.trim(),
    })
    .select()
    .single()
  
  if (error) {
    console.error('Error adding comment:', error)
    throw error
  }
  
  return data
}

export async function getReviewComments(userBookId: string) {
  const supabase = createClient()
  
  const { data: comments, error: commentsError } = await supabase
    .from('review_comments')
    .select('*')
    .eq('user_book_id', userBookId)
    .order('created_at', { ascending: true })
  
  if (commentsError) {
    console.error('Error fetching comments:', commentsError)
    throw commentsError
  }
  
  if (!comments || comments.length === 0) {
    return []
  }
  
  // Get user details for comments
  const userIds = [...new Set(comments.map(c => c.user_id))]
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, username, display_name, avatar_url')
    .in('id', userIds)
  
  if (usersError) {
    console.error('Error fetching comment users:', usersError)
    return comments
  }
  
  return comments.map(comment => ({
    ...comment,
    user: users?.find(user => user.id === comment.user_id)
  }))
}
*/

// FEATURE: User Profile Management
export async function updateUserProfile(updates: {
  display_name?: string
  bio?: string
  avatar_url?: string
}) {
  // Validate input
  const validatedUpdates = validateInput(updateUserProfileSchema, {
    display_name: updates.display_name ? sanitizeString(updates.display_name) : undefined,
    bio: updates.bio ? sanitizeString(updates.bio) : undefined,
    avatar_url: updates.avatar_url
  })

  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')
  
  // Validate user ID
  validateInput(userIdSchema, user.id)

  const { data, error } = await supabase
    .from('users')
    .update(validatedUpdates)
    .eq('id', user.id)
    .select()
    .single()
  
  if (error) {
    console.error('Error updating user profile:', error)
    throw error
  }
  
  return data
}

export async function getUserProfile(userId: string) {
  // Validate input
  const validatedUserId = validateInput(userIdSchema, userId)

  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', validatedUserId)
    .single()
  
  if (error) {
    console.error('Error fetching user profile:', error)
    throw error
  }
  
  return data
}

// FEATURE: Search public reading lists
export async function searchPublicLists(query: string, limit: number = 20) {
  // Validate input
  const validatedQuery = validateInput(searchQuerySchema, sanitizeString(query))
  
  const supabase = createClient()
  
  const { data: lists, error: listsError } = await supabase
    .from('lists')
    .select(`
      *,
      users (
        id,
        username,
        display_name
      ),
      list_items (
        id
      )
    `)
    .eq('is_public', true)
    .ilike('title', `%${validatedQuery}%`)
    .order('created_at', { ascending: false })
    .limit(Math.min(limit, 100)) // Cap limit to prevent abuse
  
  if (listsError) {
    console.error('Error searching public lists:', listsError)
    throw listsError
  }
  
  return lists || []
}

// Optimized book search with full-text search
export async function searchBooks(
  query: string,
  options: {
    limit?: number
    offset?: number
    filters?: {
      categories?: string[]
      authors?: string[]
      publishedAfter?: string
      publishedBefore?: string
    }
  } = {}
) {
  return withDatabaseRetry(async () => {
    const { limit = 20, offset = 0, filters } = options
    const supabase = createClient()
    
    // Validate input
    const searchSchema = z.string().min(1).max(100)
    const validatedQuery = validateInput(searchSchema, query)
    
    let searchQuery = supabase
      .from('books')
      .select(`
        google_books_id,
        title,
        authors,
        cover_url,
        description,
        page_count,
        published_date,
        publisher,
        categories,
        isbn_10,
        isbn_13
      `, { count: 'exact' })
    
    // Full-text search with ranking
    const searchTerm = validatedQuery.trim()
    
    if (searchTerm.length > 0) {
      searchQuery = searchQuery
        .or(`
          title.ilike.%${searchTerm}%,
          authors.cs.{${searchTerm}},
          to_tsvector('english', title || ' ' || array_to_string(authors, ' ')).@@.plainto_tsquery('english', '${searchTerm}')
        `)
        .order('ts_rank(to_tsvector(\'english\', title || \' \' || array_to_string(authors, \' \')), plainto_tsquery(\'english\', \'${searchTerm}\'))', { ascending: false })
    }
    
    // Apply category filter
    if (filters?.categories && filters.categories.length > 0) {
      searchQuery = searchQuery.overlaps('categories', filters.categories)
    }
    
    // Apply author filter
    if (filters?.authors && filters.authors.length > 0) {
      searchQuery = searchQuery.overlaps('authors', filters.authors)
    }
    
    // Apply date filters
    if (filters?.publishedAfter) {
      searchQuery = searchQuery.gte('published_date', filters.publishedAfter)
    }
    
    if (filters?.publishedBefore) {
      searchQuery = searchQuery.lte('published_date', filters.publishedBefore)
    }
    
    // Apply pagination
    searchQuery = searchQuery.range(offset, offset + limit - 1)
    
    const { data, error, count } = await searchQuery
    
    if (error) {
      throw new Error(`Failed to search books: ${error.message}`)
    }
    
    return {
      books: data || [],
      total: count || 0,
      hasMore: (count || 0) > offset + limit
    }
  })
}

// Optimized suggestions with full-text search
export async function getBookSuggestions(
  userId: string,
  options: {
    limit?: number
    categories?: string[]
    authors?: string[]
  } = {}
) {
  return withDatabaseRetry(async () => {
    const { limit = 10, categories, authors } = options
    const supabase = createClient()

    // Get user's reading preferences
    const { data: userBooks } = await supabase
      .from('user_books')
      .select(`
        books (
          categories,
          authors
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'read')
      .limit(50) // Analyze recent reads

    // Extract preferred categories and authors
    const preferredCategories = new Set<string>()
    const preferredAuthors = new Set<string>()

    userBooks?.forEach(ub => {
      const bookData = ub.books as any
      bookData?.categories?.forEach((cat: string) => preferredCategories.add(cat))
      bookData?.authors?.forEach((author: string) => preferredAuthors.add(author))
    })

    // Find similar books
    let suggestionQuery = supabase
      .from('books')
      .select(`
        google_books_id,
        title,
        authors,
        cover_url,
        categories,
        description
      `)
      .limit(limit)

    // Apply category preferences
    if (preferredCategories.size > 0 || categories?.length) {
      const targetCategories = categories?.length ? categories : Array.from(preferredCategories)
      suggestionQuery = suggestionQuery.overlaps('categories', targetCategories)
    }

    // Apply author preferences
    if (preferredAuthors.size > 0 || authors?.length) {
      const targetAuthors = authors?.length ? authors : Array.from(preferredAuthors)
      suggestionQuery = suggestionQuery.overlaps('authors', targetAuthors)
    }

    // Exclude books user already has
    const { data: excludeBooks } = await supabase
      .from('user_books')
      .select('google_books_id')
      .eq('user_id', userId)

    if (excludeBooks?.length) {
      const excludeIds = excludeBooks.map(book => book.google_books_id)
      suggestionQuery = suggestionQuery.not('google_books_id', 'in', `(${excludeIds.join(',')})`)
    }

    const { data, error } = await suggestionQuery

    if (error) {
      throw new Error(`Failed to get suggestions: ${error.message}`)
    }

    return data || []
  })
}

export async function deleteUserBook(id: string) {
  return withDatabaseRetry(async () => {
    const supabase = createClient()

    const { error } = await supabase
      .from('user_books')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to delete book: ${error.message}`)
    }

    return true
  })
} 