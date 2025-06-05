'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Star, BookOpen, Calendar, Users, Tag, ArrowLeft, User } from 'lucide-react'
import { GoogleBook } from '@/lib/google-books'
import { addBookToUserLibrary, updateBookStatus, cacheBookInDatabase } from '@/lib/database'
import { useRouter } from 'next/navigation'
import StarRating from './StarRating'
import Link from 'next/link'
import DOMPurify from 'dompurify'
import { ComponentErrorBoundary } from './ErrorBoundary'

interface BookDetails {
  book: any
  reviews: Array<{
    id: string
    user_id: string
    rating?: number
    review_text?: string
    status: string
    updated_at: string
    user?: {
      id: string
      username: string
      display_name?: string
      avatar_url?: string
    }
  }>
  overallRating: number
  totalRatings: number
  stats: {
    totalReaders: number
    wantToRead: number
    reading: number
    read: number
  }
}

interface BookDetailClientProps {
  book: GoogleBook
  userBook?: any
  bookDetails: BookDetails
}

export default function BookDetailClient({ book, userBook, bookDetails }: BookDetailClientProps) {
  return (
    <ComponentErrorBoundary componentName="BookDetail">
      <BookDetailClientInner book={book} userBook={userBook} bookDetails={bookDetails} />
    </ComponentErrorBoundary>
  )
}

function BookDetailClientInner({ book, userBook, bookDetails }: BookDetailClientProps) {
  const [currentUserBook, setCurrentUserBook] = useState(userBook)
  const [isLoading, setIsLoading] = useState(false)
  const [reviewText, setReviewText] = useState(userBook?.review_text || '')
  const router = useRouter()

  const { volumeInfo } = book

  const handleStatusChange = async (status: 'want_to_read' | 'reading' | 'read') => {
    setIsLoading(true)
    try {
      await cacheBookInDatabase(book)
      
      if (currentUserBook) {
        const updated = await updateBookStatus(book.id, status, currentUserBook.rating, reviewText)
        setCurrentUserBook(updated)
      } else {
        const newUserBook = await addBookToUserLibrary(book.id, status)
        setCurrentUserBook(newUserBook)
      }
    } catch (error) {
      console.error('Error updating book status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRatingChange = async (rating: number) => {
    setIsLoading(true)
    try {
      await cacheBookInDatabase(book)
      
      if (currentUserBook) {
        const updated = await updateBookStatus(book.id, currentUserBook.status, rating, reviewText)
        setCurrentUserBook(updated)
      } else {
        const newUserBook = await addBookToUserLibrary(book.id, 'read', rating, reviewText)
        setCurrentUserBook(newUserBook)
      }
    } catch (error) {
      console.error('Error updating rating:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleReviewSubmit = async () => {
    if (!reviewText.trim()) return
    
    setIsLoading(true)
    try {
      await cacheBookInDatabase(book)
      
      if (currentUserBook) {
        const updated = await updateBookStatus(book.id, currentUserBook.status, currentUserBook.rating, reviewText)
        setCurrentUserBook(updated)
      } else {
        const newUserBook = await addBookToUserLibrary(book.id, 'read', undefined, reviewText)
        setCurrentUserBook(newUserBook)
      }
    } catch (error) {
      console.error('Error updating review:', error)
    } finally {
      setIsLoading(false)
    }
  }

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
      default: return 'Add to Library'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

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
        Back
      </button>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Book Cover and Actions */}
        <div className="lg:col-span-1">
          <div className="sticky top-8">
            <div className="text-center mb-6">
              {volumeInfo.imageLinks?.thumbnail ? (
                <img
                  src={volumeInfo.imageLinks.thumbnail.replace('zoom=1', 'zoom=2')}
                  alt={volumeInfo.title}
                  className="w-64 h-96 object-cover rounded-lg shadow-lg mx-auto"
                />
              ) : (
                <div className="w-64 h-96 bg-gray-600 rounded-lg flex items-center justify-center mx-auto">
                  <BookOpen className="h-24 w-24 text-gray-400" />
                </div>
              )}
            </div>

            {/* Overall Rating */}
            {bookDetails.totalRatings > 0 && (
              <div className="card mb-6 text-center">
                <h3 className="text-lg font-semibold text-white mb-2">Overall Rating</h3>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-5 w-5 ${
                          star <= Math.round(bookDetails.overallRating)
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-600'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-white font-medium">{bookDetails.overallRating}</span>
                </div>
                <p className="text-gray-400 text-sm">
                  Based on {bookDetails.totalRatings} rating{bookDetails.totalRatings !== 1 ? 's' : ''}
                </p>
              </div>
            )}

            {/* Reading Stats */}
            <div className="card mb-6">
              <h3 className="text-lg font-semibold text-white mb-4">Reading Stats</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Readers:</span>
                  <span className="text-white">{bookDetails.stats.totalReaders}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Want to Read:</span>
                  <span className="text-blue-400">{bookDetails.stats.wantToRead}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Currently Reading:</span>
                  <span className="text-green-400">{bookDetails.stats.reading}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Finished:</span>
                  <span className="text-yellow-400">{bookDetails.stats.read}</span>
                </div>
              </div>
            </div>

            {/* Book Actions */}
            <div className="card space-y-4">
              <h3 className="text-lg font-semibold text-white mb-4">Your Status</h3>
              
              <div className="space-y-2">
                {['want_to_read', 'reading', 'read'].map((status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(status as any)}
                    disabled={isLoading}
                    className={`w-full p-3 rounded-lg border transition-all ${
                      currentUserBook?.status === status
                        ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                        : 'border-gray-600 hover:border-gray-500 text-gray-300 hover:text-white'
                    }`}
                  >
                    {getStatusText(status)}
                  </button>
                ))}
              </div>

              {/* Rating */}
              <div className="pt-4 border-t border-gray-700">
                <h4 className="text-white font-medium mb-3">Your Rating</h4>
                <StarRating
                  rating={currentUserBook?.rating || 0}
                  onRatingChange={handleRatingChange}
                  size="lg"
                />
              </div>

              {/* Review */}
              <div className="pt-4 border-t border-gray-700">
                <h4 className="text-white font-medium mb-3">Your Review</h4>
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Write your review..."
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 resize-none"
                  rows={4}
                />
                <button
                  onClick={handleReviewSubmit}
                  disabled={isLoading || !reviewText.trim()}
                  className="mt-2 btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {currentUserBook?.review_text ? 'Update Review' : 'Save Review'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Book Information */}
        <div className="lg:col-span-2">
          <div className="space-y-6">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">{volumeInfo.title}</h1>
              {volumeInfo.subtitle && (
                <h2 className="text-xl text-gray-300 mb-4">{volumeInfo.subtitle}</h2>
              )}
              <p className="text-lg text-gray-400">
                by {volumeInfo.authors?.join(', ') || 'Unknown Author'}
              </p>
            </div>

            {/* Book Metadata */}
            <div className="grid md:grid-cols-2 gap-4">
              {volumeInfo.publishedDate && (
                <div className="flex items-center gap-2 text-gray-300">
                  <Calendar className="h-5 w-5" />
                  <span>Published {new Date(volumeInfo.publishedDate).getFullYear()}</span>
                </div>
              )}
              
              {volumeInfo.pageCount && (
                <div className="flex items-center gap-2 text-gray-300">
                  <BookOpen className="h-5 w-5" />
                  <span>{volumeInfo.pageCount} pages</span>
                </div>
              )}
              
              {volumeInfo.publisher && (
                <div className="flex items-center gap-2 text-gray-300">
                  <Users className="h-5 w-5" />
                  <span>{volumeInfo.publisher}</span>
                </div>
              )}
              
              {volumeInfo.language && (
                <div className="flex items-center gap-2 text-gray-300">
                  <Tag className="h-5 w-5" />
                  <span>{volumeInfo.language.toUpperCase()}</span>
                </div>
              )}
            </div>

            {/* Categories */}
            {volumeInfo.categories && volumeInfo.categories.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Genres</h3>
                <div className="flex flex-wrap gap-2">
                  {volumeInfo.categories.map((category, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-sm"
                    >
                      {category}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {volumeInfo.description && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Description</h3>
                <div 
                  className="text-gray-300 leading-relaxed prose prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ 
                    __html: DOMPurify.sanitize(volumeInfo.description, {
                      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'i', 'b', 'u'],
                      ALLOWED_ATTR: []
                    })
                  }}
                />
              </div>
            )}

            {/* Reviews Section */}
            <div>
              <h3 className="text-2xl font-semibold text-white mb-6">
                Reviews ({bookDetails.reviews.length})
              </h3>
              
              {bookDetails.reviews.length === 0 ? (
                <div className="text-center py-8 card">
                  <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400">No reviews yet. Be the first to review this book!</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {bookDetails.reviews.map((review) => (
                    <div key={review.id} className="card">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          {review.user?.avatar_url ? (
                            <img
                              src={review.user.avatar_url}
                              alt={review.user.display_name || review.user.username}
                              className="w-10 h-10 rounded-full"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                              <User className="h-5 w-5 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Link
                              href={`/user/${review.user?.username}`}
                              className="font-medium text-white hover:text-blue-400 transition-colors"
                            >
                              {review.user?.display_name || review.user?.username || 'Anonymous'}
                            </Link>
                            {review.rating && (
                              <div className="flex items-center gap-1">
                                <div className="flex">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={`h-4 w-4 ${
                                        star <= review.rating!
                                          ? 'text-yellow-400 fill-current'
                                          : 'text-gray-600'
                                      }`}
                                    />
                                  ))}
                                </div>
                                <span className="text-sm text-gray-400">{review.rating}/5</span>
                              </div>
                            )}
                            <span className="text-sm text-gray-500">
                              {formatDate(review.updated_at)}
                            </span>
                          </div>
                          {review.review_text && (
                            <p className="text-gray-300 leading-relaxed">{review.review_text}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
} 