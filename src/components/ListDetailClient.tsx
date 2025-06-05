'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Plus, Trash2, Edit, ArrowLeft, Globe, Lock, User, Search, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { addBookToList, removeBookFromList, cacheBookInDatabase } from '@/lib/database'
import BookSearch from './BookSearch'
import { GoogleBook } from '@/lib/google-books'
import { formatDate } from '@/lib/utils'

interface ListItem {
  id: string
  google_books_id: string
  position: number
  book: {
    google_books_id: string
    title: string
    authors: string[]
    cover_url?: string
    description?: string
  }
}

interface List {
  id: string
  title: string
  description?: string
  is_public: boolean
  created_at: string
  updated_at: string
  user_id: string
  user?: {
    id: string
    username: string
    display_name?: string
    avatar_url?: string
  }
  items: ListItem[]
}

interface ListDetailClientProps {
  list: List
  currentUserId: string
}

export default function ListDetailClient({ list, currentUserId }: ListDetailClientProps) {
  const [currentList, setCurrentList] = useState(list)
  const [showAddBook, setShowAddBook] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [removingBookId, setRemovingBookId] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  const isOwner = currentUserId === list.user_id

  const handleAddBook = async (book: GoogleBook) => {
    if (!isOwner) return

    setIsLoading(true)
    try {
      // Cache the book first
      await cacheBookInDatabase(book)
      
      // Add to list
      await addBookToList(list.id, book.id)
      
      // Simple page refresh to show the new book
      window.location.reload()
    } catch (error: any) {
      console.error('Error adding book to list:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveBook = async (googleBooksId: string) => {
    if (!isOwner) return
    
    if (!confirm('Remove this book from the list?')) return

    setRemovingBookId(googleBooksId)
    try {
      await removeBookFromList(list.id, googleBooksId)
      
      // Simple page refresh
      window.location.reload()
    } catch (error: any) {
      console.error('Error removing book from list:', error)
    } finally {
      setRemovingBookId(null)
    }
  }

  useEffect(() => {
    if (searchParams.get('add') === 'true') {
      setShowAddBook(true)
    }
  }, [searchParams])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="h-5 w-5" />
        Back to Lists
      </button>

      {/* List Header */}
      <div className="card mb-8">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white mb-2">{currentList.title}</h1>
            {currentList.description && (
              <p className="text-gray-300 mb-4">{currentList.description}</p>
            )}
            
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-1">
                {currentList.is_public ? (
                  <>
                    <Globe className="h-4 w-4" />
                    Public
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    Private
                  </>
                )}
              </div>
              
              <span>•</span>
              
              <span>{currentList.items.length} books</span>
              
              <span>•</span>
              
              <span>Created {formatDate(currentList.created_at)}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isOwner && (
              <>
                <button
                  onClick={() => setShowAddBook(!showAddBook)}
                  className={`btn-primary flex items-center gap-2 ${showAddBook ? 'bg-red-600 hover:bg-red-700' : ''}`}
                  disabled={isLoading}
                >
                  {showAddBook ? (
                    <>
                      <X className="h-4 w-4" />
                      Cancel
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Add Book
                    </>
                  )}
                </button>
                <Link
                  href={`/lists/${list.id}/edit`}
                  className="btn-secondary flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </Link>
              </>
            )}
          </div>
        </div>

        {/* List Creator */}
        {currentList.user && (
          <div className="flex items-center gap-3 pt-4 border-t border-gray-700">
            <div className="flex-shrink-0">
              {currentList.user.avatar_url ? (
                <img
                  src={currentList.user.avatar_url}
                  alt={currentList.user.display_name || currentList.user.username}
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-gray-400" />
                </div>
              )}
            </div>
            <div>
              <Link
                href={`/user/${currentList.user.username}`}
                className="text-white hover:text-blue-400 transition-colors font-medium"
              >
                {currentList.user.display_name || currentList.user.username}
              </Link>
              <p className="text-gray-400 text-sm">List creator</p>
            </div>
          </div>
        )}
      </div>

      {/* Add Book Section */}
      <AnimatePresence>
        {showAddBook && isOwner && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="card mb-8 overflow-hidden relative z-10"
          >
            <div className="flex items-center gap-2 mb-4">
              <Search className="h-5 w-5 text-blue-400" />
              <h3 className="text-lg font-semibold text-white">Add Books to Your List</h3>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              Search for books and click on them to add to your list
            </p>
            <div className="relative z-[60]">
              <BookSearch 
                onBookSelect={handleAddBook}
                placeholder="Search for books to add to your list..."
                showAddToLibrary={false}
              />
            </div>
            <div className="mt-4 pt-4 border-t border-gray-700">
              <button
                onClick={() => setShowAddBook(false)}
                className="btn-secondary w-full"
              >
                Done Adding Books
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Books List */}
      <div>
        <h2 className="text-2xl font-semibold text-white mb-6">
          Books in this list ({currentList.items.length})
        </h2>
        
        {currentList.items.length === 0 ? (
          <div className="text-center py-12 card">
            <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No books yet</h3>
            <p className="text-gray-400 mb-6">
              {isOwner 
                ? "Start building your list by adding some books!"
                : "This list doesn't have any books yet."
              }
            </p>
            {isOwner && (
              <button
                onClick={() => setShowAddBook(true)}
                className="btn-primary"
              >
                Add Your First Book
              </button>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence>
              {currentList.items.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="card hover:shadow-lg transition-all duration-200 group"
                >
                  <Link href={`/book/${item.google_books_id}`}>
                    <div className="text-center space-y-3">
                      {item.book.cover_url ? (
                        <img
                          src={item.book.cover_url}
                          alt={item.book.title}
                          className="w-32 h-48 object-cover rounded mx-auto group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-32 h-48 bg-gray-600 rounded mx-auto flex items-center justify-center group-hover:scale-105 transition-transform">
                          <BookOpen className="h-12 w-12 text-gray-400" />
                        </div>
                      )}
                      
                      <div>
                        <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors line-clamp-2">
                          {item.book.title}
                        </h3>
                        <p className="text-gray-400 text-sm line-clamp-1">
                          {item.book.authors.join(', ')}
                        </p>
                      </div>
                    </div>
                  </Link>
                  
                  {isOwner && (
                    <div className="mt-3 pt-3 border-t border-gray-700">
                      <button
                        onClick={() => handleRemoveBook(item.google_books_id)}
                        disabled={removingBookId === item.google_books_id}
                        className="w-full flex items-center justify-center gap-2 text-red-400 hover:text-red-300 transition-colors text-sm disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        {removingBookId === item.google_books_id ? 'Removing...' : 'Remove'}
                      </button>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  )
} 