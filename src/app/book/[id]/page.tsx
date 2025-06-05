import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getBookDetails as getGoogleBookDetails } from '@/lib/google-books'
import { getUserBookByGoogleId, cacheBookInDatabase, getBookDetails } from '@/lib/database'
import BookDetailClient from '@/components/BookDetailClient'

interface BookPageProps {
  params: {
    id: string
  }
}

export default async function BookPage({ params }: BookPageProps) {
  const supabase = createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  try {
    // Get book from Google Books API
    const googleBook = await getGoogleBookDetails(params.id)
    
    if (!googleBook) {
      throw new Error('Book not found')
    }
    
    // Cache the book in our database
    await cacheBookInDatabase(googleBook)
    
    // Get book details including reviews and ratings
    const bookDetails = await getBookDetails(params.id)
    
    // Get current user's book status
    const userBook = await getUserBookByGoogleId(user.id, params.id)

    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <BookDetailClient 
            book={googleBook} 
            userBook={userBook}
            bookDetails={bookDetails}
          />
        </div>
      </div>
    )
  } catch (error) {
    console.error('Error loading book:', error)
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Book Not Found</h1>
          <p className="text-gray-400">The book you're looking for could not be found.</p>
        </div>
      </div>
    )
  }
} 