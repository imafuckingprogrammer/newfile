import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { BookOpen, Users, Star, TrendingUp, Search, Plus } from 'lucide-react'
import { getUserBooks } from '@/lib/database'
import BookSearch from '@/components/BookSearch'

export default async function HomePage() {
  const supabase = createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#1a1a1a' }}>
        {/* Hero Section */}
        <div className="relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <div className="text-center">
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
                Track Your Reading Journey
              </h1>
              <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
                Discover new books, track your reading progress, rate and review your favorites, 
                and connect with fellow book lovers in our vibrant reading community.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/signup" className="btn-primary text-lg px-8 py-3">
                  Get Started
                </Link>
                <Link href="/login" className="btn-secondary text-lg px-8 py-3">
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="py-24" style={{ backgroundColor: '#2a2a2a' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-white mb-4">
                Everything You Need to Track Your Reading
              </h2>
              <p className="text-gray-300 text-lg">
                Powerful features to enhance your reading experience
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: '#3b82f6' }}>
                  <BookOpen className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Track Books</h3>
                <p className="text-gray-300">
                  Keep track of books you want to read, are currently reading, and have finished.
                </p>
              </div>

              <div className="text-center">
                <div className="p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: '#3b82f6' }}>
                  <Star className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Rate & Review</h3>
                <p className="text-gray-300">
                  Rate books and write detailed reviews to share your thoughts with the community.
                </p>
              </div>

              <div className="text-center">
                <div className="p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: '#3b82f6' }}>
                  <Users className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Social Features</h3>
                <p className="text-gray-300">
                  Follow friends, see what they're reading, and discover new books through their recommendations.
                </p>
              </div>

              <div className="text-center">
                <div className="p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: '#3b82f6' }}>
                  <TrendingUp className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Reading Stats</h3>
                <p className="text-gray-300">
                  Track your reading progress with detailed statistics and reading goals.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="py-24">
          <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Start Your Reading Journey?
            </h2>
            <p className="text-gray-300 text-lg mb-8">
              Join thousands of readers who are already tracking their books and discovering new favorites.
            </p>
            <Link href="/signup" className="btn-primary text-lg px-8 py-3">
              Create Your Account
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Fetch user's recent activity using the fixed function
  let allUserBooks: any[] = []
  try {
    allUserBooks = await getUserBooks(user.id)
  } catch (error) {
    console.error('Error fetching user books:', error)
  }

  const recentBooks = allUserBooks.slice(0, 6)
  const currentlyReading = allUserBooks.filter(book => book.status === 'reading').slice(0, 3)

  // Calculate consistent reading stats
  const totalBooks = allUserBooks.length
  const booksRead = allUserBooks.filter(book => book.status === 'read').length

  // Authenticated user dashboard
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            Welcome back to BookTracker!
          </h1>
          <p className="text-gray-300 text-lg">
            Continue your reading journey and discover new books
          </p>
        </div>

        {/* Quick Search */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-4 text-center">Quick Book Search</h2>
          <BookSearch placeholder="Search for books to add to your library..." />
        </div>

        {/* Reading Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <div className="card text-center">
            <div className="text-2xl font-bold text-white">{totalBooks}</div>
            <div className="text-gray-400">Total Books</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-yellow-400">{booksRead}</div>
            <div className="text-gray-400">Books Read</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-green-400">{currentlyReading.length}</div>
            <div className="text-gray-400">Currently Reading</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-blue-400">
              {new Date().getFullYear()}
            </div>
            <div className="text-gray-400">Reading Year</div>
          </div>
        </div>

        {/* Currently Reading */}
        {currentlyReading.length > 0 && (
          <div className="card mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-white">Currently Reading</h2>
              <Link href="/my-books" className="text-blue-400 hover:text-blue-300">
                View all books
              </Link>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {currentlyReading.map((userBook: any) => (
                <Link
                  key={userBook.id}
                  href={`/book/${userBook.books.google_books_id}`}
                  className="flex gap-4 p-4 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <div className="flex-shrink-0">
                    {userBook.books.cover_url ? (
                      <img
                        src={userBook.books.cover_url}
                        alt={userBook.books.title}
                        className="w-16 h-24 object-cover rounded"
                      />
                    ) : (
                      <div className="w-16 h-24 bg-gray-600 rounded flex items-center justify-center">
                        <BookOpen className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-1">{userBook.books.title}</h3>
                    <p className="text-gray-400 text-sm mb-2">
                      {userBook.books.authors.join(', ')}
                    </p>
                    <span className="text-xs px-2 py-1 rounded bg-green-500/10 text-green-400">
                      Currently Reading
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Link href="/search" className="card hover:opacity-80 transition-opacity">
            <div className="text-center">
              <Search className="h-12 w-12 mx-auto mb-4" style={{ color: '#3b82f6' }} />
              <h3 className="text-xl font-semibold text-white mb-2">Search Books</h3>
              <p className="text-gray-300">Find and add new books to your library</p>
            </div>
          </Link>
          
          <Link href="/my-books" className="card hover:opacity-80 transition-opacity">
            <div className="text-center">
              <BookOpen className="h-12 w-12 mx-auto mb-4" style={{ color: '#3b82f6' }} />
              <h3 className="text-xl font-semibold text-white mb-2">My Books</h3>
              <p className="text-gray-300">View and manage your book collection</p>
            </div>
          </Link>
          
          <Link href="/feed" className="card hover:opacity-80 transition-opacity">
            <div className="text-center">
              <Users className="h-12 w-12 mx-auto mb-4" style={{ color: '#3b82f6' }} />
              <h3 className="text-xl font-semibold text-white mb-2">Social Feed</h3>
              <p className="text-gray-300">See what your friends are reading</p>
            </div>
          </Link>
        </div>

        {/* Recent Activity */}
        {recentBooks.length > 0 && (
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-white">Recent Activity</h2>
              <Link href="/my-books" className="text-blue-400 hover:text-blue-300">
                View all
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {recentBooks.map((userBook: any) => (
                <Link
                  key={userBook.id}
                  href={`/book/${userBook.books.google_books_id}`}
                  className="group text-center"
                >
                  {userBook.books.cover_url ? (
                    <img
                      src={userBook.books.cover_url}
                      alt={userBook.books.title}
                      className="w-full h-32 object-cover rounded mb-2 group-hover:shadow-lg transition-shadow"
                    />
                  ) : (
                    <div className="w-full h-32 bg-gray-600 rounded mb-2 flex items-center justify-center group-hover:shadow-lg transition-shadow">
                      <BookOpen className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                  <h3 className="text-white text-sm font-medium truncate">
                    {userBook.books.title}
                  </h3>
                  <p className="text-gray-400 text-xs truncate">
                    {userBook.books.authors.join(', ')}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Empty State for New Users */}
        {recentBooks.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Start Your Reading Journey</h3>
            <p className="text-gray-400 mb-6">
              Search for books and add them to your library to get started!
            </p>
            <Link href="/search" className="btn-primary">
              Search Books
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
