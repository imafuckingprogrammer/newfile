import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getUserBooks } from '@/lib/database'
import MyBooksClient from '@/components/MyBooksClient'

export default async function MyBooksPage() {
  const supabase = createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user's books with book details using the fixed function
  let userBooks: any[] = []
  try {
    userBooks = await getUserBooks(user.id)
  } catch (error) {
    console.error('Error fetching user books:', error)
  }

  // Calculate reading statistics
  const stats = {
    totalBooks: userBooks.length,
    wantToRead: userBooks.filter(book => book.status === 'want_to_read').length,
    reading: userBooks.filter(book => book.status === 'reading').length,
    read: userBooks.filter(book => book.status === 'read').length,
    averageRating: userBooks.filter(book => book.rating).reduce((acc, book) => acc + book.rating, 0) / (userBooks.filter(book => book.rating).length || 1) || 0,
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <MyBooksClient userBooks={userBooks} stats={stats} />
      </div>
    </div>
  )
} 