'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Star, Calendar, Filter, Grid, List } from 'lucide-react'
import Link from 'next/link'
import StarRating from './StarRating'

interface UserBook {
  id: string
  status: 'want_to_read' | 'reading' | 'read'
  rating?: number
  review_text?: string
  date_started?: string
  date_finished?: string
  created_at: string
  updated_at: string
  books: {
    google_books_id: string
    title: string
    authors: string[]
    cover_url?: string
    description?: string
    page_count?: number
    published_date?: string
    genres: string[]
  }
}

interface Stats {
  totalBooks: number
  wantToRead: number
  reading: number
  read: number
  averageRating: number
}

interface MyBooksClientProps {
  userBooks: UserBook[]
  stats: Stats
}

export default function MyBooksClient({ userBooks, stats }: MyBooksClientProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('updated_at')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const statusOptions = [
    { value: 'all', label: 'All Books', count: stats.totalBooks },
    { value: 'want_to_read', label: 'Want to Read', count: stats.wantToRead },
    { value: 'reading', label: 'Currently Reading', count: stats.reading },
    { value: 'read', label: 'Read', count: stats.read },
  ]

  const sortOptions = [
    { value: 'updated_at', label: 'Recently Updated' },
    { value: 'created_at', label: 'Date Added' },
    { value: 'title', label: 'Title' },
    { value: 'rating', label: 'Rating' },
    { value: 'date_finished', label: 'Date Finished' },
  ]

  const filteredBooks = userBooks.filter(book => 
    selectedStatus === 'all' || book.status === selectedStatus
  )

  const sortedBooks = [...filteredBooks].sort((a, b) => {
    switch (sortBy) {
      case 'title':
        return a.books.title.localeCompare(b.books.title)
      case 'rating':
        return (b.rating || 0) - (a.rating || 0)
      case 'date_finished':
        if (!a.date_finished && !b.date_finished) return 0
        if (!a.date_finished) return 1
        if (!b.date_finished) return -1
        return new Date(b.date_finished).getTime() - new Date(a.date_finished).getTime()
      case 'created_at':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      default: // updated_at
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    }
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'want_to_read': return 'text-blue-400'
      case 'reading': return 'text-green-400'
      case 'read': return 'text-yellow-400'
      default: return 'text-gray-400'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'want_to_read': return 'Want to Read'
      case 'reading': return 'Currently Reading'
      case 'read': return 'Read'
      default: return status
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">My Books</h1>
        <p className="text-gray-300 text-lg">
          Track your reading journey and discover new favorites
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <div className="text-2xl font-bold text-white">{stats.totalBooks}</div>
          <div className="text-gray-400">Total Books</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-blue-400">{stats.wantToRead}</div>
          <div className="text-gray-400">Want to Read</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-green-400">{stats.reading}</div>
          <div className="text-gray-400">Reading</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-yellow-400">{stats.read}</div>
          <div className="text-gray-400">Read</div>
        </div>
      </div>

      {/* Average Rating - only show if user has rated books */}
      {stats.averageRating > 0 && (
        <div className="card text-center max-w-md mx-auto">
          <div className="text-lg font-semibold text-white mb-2">Your Average Rating</div>
          <StarRating rating={Math.round(stats.averageRating)} readonly size="lg" />
          <div className="text-gray-400 mt-2">{stats.averageRating.toFixed(1)}/5</div>
          <p className="text-gray-500 text-xs mt-1">
            Based on {userBooks.filter(book => book.rating).length} books you've rated
          </p>
        </div>
      )}

      {/* Filters and Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedStatus(option.value)}
              className={`px-4 py-2 rounded-lg border transition-all ${
                selectedStatus === option.value
                  ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                  : 'border-gray-600 text-gray-300 hover:border-gray-500'
              }`}
            >
              {option.label} ({option.count})
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-surface border border-gray-600 rounded-lg px-3 py-2 text-white"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <div className="flex border border-gray-600 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Books Display */}
      {sortedBooks.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No books found</h3>
          <p className="text-gray-400 mb-6">
            {selectedStatus === 'all' 
              ? "You haven't added any books yet. Start by searching for books to add to your library."
              : `No books in "${statusOptions.find(s => s.value === selectedStatus)?.label}" status.`
            }
          </p>
          <Link href="/search" className="btn-primary">
            Search Books
          </Link>
        </div>
      ) : (
        <motion.div
          layout
          className={viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
            : 'space-y-4'
          }
        >
          {sortedBooks.map((userBook) => (
            <motion.div
              key={userBook.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className={viewMode === 'grid' ? 'card hover:shadow-lg transition-shadow' : 'card'}
            >
              <Link href={`/book/${userBook.books.google_books_id}`}>
                <div className={viewMode === 'grid' ? 'space-y-4' : 'flex gap-4'}>
                  <div className={viewMode === 'grid' ? 'text-center' : 'flex-shrink-0'}>
                    {userBook.books.cover_url ? (
                      <img
                        src={userBook.books.cover_url}
                        alt={userBook.books.title}
                        className={viewMode === 'grid' 
                          ? 'w-32 h-48 object-cover rounded mx-auto'
                          : 'w-16 h-24 object-cover rounded'
                        }
                      />
                    ) : (
                      <div className={`bg-gray-600 rounded flex items-center justify-center ${
                        viewMode === 'grid' ? 'w-32 h-48 mx-auto' : 'w-16 h-24'
                      }`}>
                        <BookOpen className={viewMode === 'grid' ? 'h-12 w-12' : 'h-6 w-6'} />
                      </div>
                    )}
                  </div>

                  <div className={viewMode === 'grid' ? 'space-y-2' : 'flex-1 space-y-1'}>
                    <h3 className={`font-semibold text-white ${viewMode === 'grid' ? 'text-center' : ''}`}>
                      {userBook.books.title}
                    </h3>
                    <p className={`text-gray-400 text-sm ${viewMode === 'grid' ? 'text-center' : ''}`}>
                      {userBook.books.authors.join(', ')}
                    </p>
                    
                    <div className={`flex items-center gap-2 ${viewMode === 'grid' ? 'justify-center' : ''}`}>
                      <span className={`text-xs px-2 py-1 rounded ${getStatusColor(userBook.status)} bg-gray-700`}>
                        {getStatusText(userBook.status)}
                      </span>
                    </div>

                    {userBook.rating && (
                      <div className={viewMode === 'grid' ? 'flex justify-center' : ''}>
                        <StarRating rating={userBook.rating} readonly size="sm" />
                      </div>
                    )}

                    {userBook.date_finished && (
                      <div className={`text-xs text-gray-500 ${viewMode === 'grid' ? 'text-center' : ''}`}>
                        Finished: {new Date(userBook.date_finished).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
} 