'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Star, Users, MessageCircle, Calendar, User } from 'lucide-react'
import Link from 'next/link'

interface ActivityItem {
  id: string
  user_id: string
  google_books_id: string
  status: 'want_to_read' | 'reading' | 'read'
  rating?: number
  review_text?: string
  created_at: string
  updated_at: string
  users: {
    id: string
    username: string
    display_name?: string
    avatar_url?: string
  }
  books: {
    title: string
    authors: string[]
    cover_url?: string
    google_books_id: string
  }
}

interface SocialFeedClientProps {
  activityFeed: ActivityItem[]
  recentReviews: ActivityItem[]
}

export default function SocialFeedClient({ activityFeed, recentReviews }: SocialFeedClientProps) {
  const [activeTab, setActiveTab] = useState<'feed' | 'reviews'>('feed')

  const getStatusText = (status: string) => {
    switch (status) {
      case 'want_to_read': return 'wants to read'
      case 'reading': return 'is reading'
      case 'read': return 'finished reading'
      default: return 'updated'
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`
    return date.toLocaleDateString()
  }

  const ActivityCard = ({ activity }: { activity: ActivityItem }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card mb-4"
    >
      <div className="flex gap-4">
        <div className="flex-shrink-0">
          {activity.users.avatar_url ? (
            <img
              src={activity.users.avatar_url}
              alt={activity.users.display_name || activity.users.username}
              className="w-10 h-10 rounded-full"
            />
          ) : (
            <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-gray-400" />
            </div>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Link
              href={`/user/${activity.users.username}`}
              className="font-medium text-white hover:text-blue-400 transition-colors"
            >
              {activity.users.display_name || activity.users.username}
            </Link>
            <span className={`text-sm ${getStatusColor(activity.status)}`}>
              {getStatusText(activity.status)}
            </span>
            <span className="text-gray-500 text-sm">
              {formatDate(activity.updated_at)}
            </span>
          </div>
          
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              {activity.books.cover_url ? (
                <img
                  src={activity.books.cover_url}
                  alt={activity.books.title}
                  className="w-12 h-16 object-cover rounded"
                />
              ) : (
                <div className="w-12 h-16 bg-gray-600 rounded flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-gray-400" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <Link
                href={`/book/${activity.books.google_books_id}`}
                className="font-medium text-white hover:text-blue-400 transition-colors"
              >
                {activity.books.title}
              </Link>
              <p className="text-gray-400 text-sm">
                by {activity.books.authors.join(', ')}
              </p>
              
              {activity.rating && (
                <div className="flex items-center gap-1 mt-1">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${
                          star <= activity.rating!
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-600'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-400">
                    {activity.rating}/5
                  </span>
                </div>
              )}
              
              {activity.review_text && (
                <div className="mt-2 p-3 bg-gray-800 rounded-lg">
                  <p className="text-gray-300 text-sm">
                    {activity.review_text.length > 200
                      ? `${activity.review_text.substring(0, 200)}...`
                      : activity.review_text}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-white mb-2">Social Feed</h1>
        <p className="text-gray-300">See what your friends are reading</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-800 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('feed')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'feed'
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Following Activity
        </button>
        <button
          onClick={() => setActiveTab('reviews')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'reviews'
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Recent Reviews
        </button>
      </div>

      {/* Content */}
      {activeTab === 'feed' && (
        <div>
          {activityFeed.length === 0 ? (
            <div className="text-center py-12 card">
              <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No activity yet</h3>
              <p className="text-gray-400 mb-6">
                Follow other users to see their reading activity here
              </p>
              <Link href="/search" className="btn-primary">
                Discover Users
              </Link>
            </div>
          ) : (
            <div>
              {activityFeed.map((activity) => (
                <ActivityCard key={`${activity.id}-${activity.updated_at}`} activity={activity} />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'reviews' && (
        <div>
          {recentReviews.length === 0 ? (
            <div className="text-center py-12 card">
              <MessageCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No reviews yet</h3>
              <p className="text-gray-400">
                Be the first to write a review!
              </p>
            </div>
          ) : (
            <div>
              {recentReviews.map((review) => (
                <ActivityCard key={`${review.id}-${review.updated_at}`} activity={review} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
} 