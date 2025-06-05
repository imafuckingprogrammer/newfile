'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Plus, Star, BookOpen, Check, X } from 'lucide-react'
import { searchBooks, GoogleBook } from '@/lib/google-books'
import { addBookToUserLibrary, cacheBookInDatabase, getUserBookByGoogleId } from '@/lib/database'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ComponentErrorBoundary } from './ErrorBoundary'

interface BookSearchProps {
  onBookSelect?: (book: GoogleBook) => void
  placeholder?: string
  showAddToLibrary?: boolean
}

interface BookWithUserStatus extends GoogleBook {
  userStatus?: 'want_to_read' | 'reading' | 'read' | null
}

export default function BookSearch({ 
  onBookSelect, 
  placeholder = "Search for books...",
  showAddToLibrary = true 
}: BookSearchProps) {
  return (
    <ComponentErrorBoundary componentName="BookSearch">
      <BookSearchInner 
        onBookSelect={onBookSelect}
        placeholder={placeholder}
        showAddToLibrary={showAddToLibrary}
      />
    </ComponentErrorBoundary>
  )
}

function BookSearchInner({ 
  onBookSelect, 
  placeholder = "Search for books...",
  showAddToLibrary = true 
}: BookSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<BookWithUserStatus[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [feedback, setFeedback] = useState<{type: 'success' | 'error', message: string} | null>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSelectedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const searchDebounced = setTimeout(async () => {
      if (query.trim().length > 2) {
        setIsLoading(true)
        try {
          const searchResults = await searchBooks(query, 8)
          const booksWithStatus = await Promise.all(
            (searchResults.items || []).map(async (book) => {
              try {
                const supabase = createClient()
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                  const userBook = await getUserBookByGoogleId(user.id, book.id)
                  return { ...book, userStatus: userBook?.status || null }
                }
                return { ...book, userStatus: null }
              } catch (error) {
                return { ...book, userStatus: null }
              }
            })
          )
          setResults(booksWithStatus)
          setIsOpen(true)
        } catch (error) {
          console.error('Search error:', error)
          setResults([])
        } finally {
          setIsLoading(false)
        }
      } else {
        setResults([])
        setIsOpen(false)
      }
    }, 300)

    return () => clearTimeout(searchDebounced)
  }, [query])

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message })
    setTimeout(() => setFeedback(null), 3000)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : 0))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : results.length - 1))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleBookSelect(results[selectedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        setSelectedIndex(-1)
        inputRef.current?.blur()
        break
    }
  }

  const handleBookSelect = async (book: GoogleBook) => {
    try {
      await cacheBookInDatabase(book)
      if (onBookSelect) {
        onBookSelect(book)
      } else {
        router.push(`/book/${book.id}`)
      }
      setQuery('')
      setIsOpen(false)
      setSelectedIndex(-1)
    } catch (error) {
      console.error('Error selecting book:', error)
      showFeedback('error', 'Failed to load book details')
    }
  }

  const handleAddToLibrary = async (book: BookWithUserStatus, status: 'want_to_read' | 'reading' | 'read') => {
    if (book.userStatus) {
      showFeedback('error', 'Book is already in your library')
      return
    }

    try {
      await cacheBookInDatabase(book)
      await addBookToUserLibrary(book.id, status)
      
      // Update the book's status in the results
      setResults(prev => prev.map(b => 
        b.id === book.id ? { ...b, userStatus: status } : b
      ))
      
      const statusText = {
        'want_to_read': 'Want to Read',
        'reading': 'Currently Reading',
        'read': 'Read'
      }[status]
      
      showFeedback('success', `Added to ${statusText}!`)
    } catch (error: any) {
      console.error('Error adding book to library:', error)
      if (error.message === 'Book already in your library') {
        showFeedback('error', 'Book is already in your library')
      } else {
        showFeedback('error', 'Failed to add book to library')
      }
    }
  }

  const getStatusIcon = (status: string | null | undefined) => {
    if (!status) return null
    return <Check className="h-3 w-3 text-green-400" />
  }

  const getStatusColor = (status: string | null | undefined) => {
    switch (status) {
      case 'want_to_read': return 'text-blue-400'
      case 'reading': return 'text-green-400'
      case 'read': return 'text-yellow-400'
      default: return 'text-gray-400'
    }
  }

  return (
    <div ref={searchRef} className="relative w-full max-w-2xl mx-auto">
      {/* Feedback Toast */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full mb-2 px-4 py-2 rounded-lg z-50 flex items-center gap-2 ${
              feedback.type === 'success' 
                ? 'bg-green-500 text-white' 
                : 'bg-red-500 text-white'
            }`}
          >
            {feedback.type === 'success' ? (
              <Check className="h-4 w-4" />
            ) : (
              <X className="h-4 w-4" />
            )}
            {feedback.message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-3 bg-surface border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isOpen && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 w-full mt-2 bg-surface border border-gray-600 rounded-lg shadow-xl max-h-96 overflow-y-auto"
          >
            {results.map((book, index) => (
              <motion.div
                key={book.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                className={`p-4 border-b border-gray-700 last:border-b-0 cursor-pointer transition-colors ${
                  selectedIndex === index ? 'bg-gray-700' : 'hover:bg-gray-700'
                }`}
                onClick={() => handleBookSelect(book)}
              >
                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    {book.volumeInfo.imageLinks?.thumbnail ? (
                      <img
                        src={book.volumeInfo.imageLinks.thumbnail}
                        alt={book.volumeInfo.title}
                        className="w-12 h-16 object-cover rounded"
                      />
                    ) : (
                      <div className="w-12 h-16 bg-gray-600 rounded flex items-center justify-center">
                        <BookOpen className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium truncate flex items-center gap-2">
                      {book.volumeInfo.title}
                      {getStatusIcon(book.userStatus)}
                    </h3>
                    <p className="text-gray-400 text-sm truncate">
                      {book.volumeInfo.authors?.join(', ') || 'Unknown Author'}
                    </p>
                    {book.volumeInfo.publishedDate && (
                      <p className="text-gray-500 text-xs">
                        {new Date(book.volumeInfo.publishedDate).getFullYear()}
                      </p>
                    )}
                    {book.userStatus && (
                      <p className={`text-xs ${getStatusColor(book.userStatus)}`}>
                        In your library
                      </p>
                    )}
                  </div>
                  {showAddToLibrary && !book.userStatus && (
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleAddToLibrary(book, 'want_to_read')
                        }}
                        className="p-1 text-gray-400 hover:text-blue-400 transition-colors"
                        title="Want to Read"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleAddToLibrary(book, 'reading')
                        }}
                        className="p-1 text-gray-400 hover:text-green-400 transition-colors"
                        title="Currently Reading"
                      >
                        <BookOpen className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleAddToLibrary(book, 'read')
                        }}
                        className="p-1 text-gray-400 hover:text-yellow-400 transition-colors"
                        title="Read"
                      >
                        <Star className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {isOpen && query.trim().length > 2 && results.length === 0 && !isLoading && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute z-50 w-full mt-2 bg-surface border border-gray-600 rounded-lg shadow-xl p-4"
        >
          <p className="text-gray-400 text-center">No books found for "{query}"</p>
        </motion.div>
      )}
    </div>
  )
} 