'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Users, Star, Calendar, UserPlus, UserMinus } from 'lucide-react'
import Link from 'next/link'
import StarRating from './StarRating'
import { createClient } from '@/lib/supabase/client'

interface User {
  id: string
  email: string
  username?: string
  display_name?: string
  avatar_url?: string
  bio?: string
  created_at: string
}

interface UserBook {
  id: string
  status: 'want_to_read' | 'reading' | 'read'
  rating?: number
  review_text?: string
  date_finished?: string
  updated_at: string
  books: {
    google_books_id: string
    title: string
    authors: string[]
    cover_url?: string
  }
}

interface Stats {
  totalBooks: number
  read: number
  reading: number
  averageRating: number
}

interface UserProfileClientProps {
  profileUser: User
  userBooks: UserBook[]
  stats: Stats
  isOwnProfile: boolean
  isFollowing: boolean
  followersCount: number
  followingCount: number
}

export default function UserProfileClient({
  profileUser,
  userBooks,
  stats,
  isOwnProfile,
  isFollowing: initialIsFollowing,
  followersCount: initialFollowersCount,
  followingCount
}: UserProfileClientProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [followersCount, setFollowersCount] = useState(initialFollowersCount)
  const [isLoading, setIsLoading] = useState(false)

  const handleFollowToggle = async () => {
    setIsLoading(true)
    const supabase = createClient()

    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', (await supabase.auth.getUser()).data.user?.id)
          .eq('following_id', profileUser.id)

        if (!error) {
          setIsFollowing(false)
          setFollowersCount(prev => prev - 1)
        }
      } else {
        // Follow
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: (await supabase.auth.getUser()).data.user?.id,
            following_id: profileUser.id
          })

        if (!error) {
          setIsFollowing(true)
          setFollowersCount(prev => prev + 1)
        }
      }
    } catch (error) {
      console.error('Error toggling follow:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const recentBooks = userBooks.filter(book => book.status === 'read').slice(0, 6)
  const currentlyReading = userBooks.filter(book => book.status === 'reading').slice(0, 3)

  return (
    <div className="space-y-8">
      {/* Profile Header */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div className="flex-shrink-0">
            {profileUser.avatar_url ? (
              <img
                src={profileUser.avatar_url}
                alt={profileUser.display_name || profileUser.username || 'User'}
                className="w-24 h-24 rounded-full object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-600 flex items-center justify-center">
                <Users className="h-12 w-12 text-gray-400" />
              </div>
            )}
          </div>

          <div className="flex-1">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-white">
                  {profileUser.display_name || profileUser.username || 'Anonymous User'}
                </h1>
                {profileUser.username && (
                  <p className="text-gray-400">@{profileUser.username}</p>
                )}
                {profileUser.bio && (
                  <p className="text-gray-300 mt-2">{profileUser.bio}</p>
                )}
              </div>

              {!isOwnProfile && (
                <button
                  onClick={handleFollowToggle}
                  disabled={isLoading}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    isFollowing
                      ? 'bg-gray-600 hover:bg-gray-700 text-white'
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  } disabled:opacity-50`}
                >
                  {isFollowing ? (
                    <>
                      <UserMinus className="h-4 w-4" />
                      Unfollow
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      Follow
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="flex gap-6 mt-4 text-sm">
              <div>
                <span className="font-semibold text-white">{followersCount}</span>
                <span className="text-gray-400 ml-1">followers</span>
              </div>
              <div>
                <span className="font-semibold text-white">{followingCount}</span>
                <span className="text-gray-400 ml-1">following</span>
              </div>
              <div>
                <span className="font-semibold text-white">{stats.read}</span>
                <span className="text-gray-400 ml-1">books read</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reading Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <div className="text-2xl font-bold text-white">{stats.totalBooks}</div>
          <div className="text-gray-400">Total Books</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-yellow-400">{stats.read}</div>
          <div className="text-gray-400">Read</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-green-400">{stats.reading}</div>
          <div className="text-gray-400">Reading</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-blue-400">
            {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '—'}
          </div>
          <div className="text-gray-400">Avg Rating</div>
        </div>
      </div>

      {/* Currently Reading */}
      {currentlyReading.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-semibold text-white mb-4">Currently Reading</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {currentlyReading.map((userBook) => (
              <Link
                key={userBook.id}
                href={`/book/${userBook.books.google_books_id}`}
                className="flex gap-3 p-3 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <div className="flex-shrink-0">
                  {userBook.books.cover_url ? (
                    <img
                      src={userBook.books.cover_url}
                      alt={userBook.books.title}
                      className="w-12 h-16 object-cover rounded"
                    />
                  ) : (
                    <div className="w-12 h-16 bg-gray-600 rounded flex items-center justify-center">
                      <BookOpen className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-white truncate">{userBook.books.title}</h3>
                  <p className="text-gray-400 text-sm truncate">
                    {userBook.books.authors.join(', ')}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent Books */}
      {recentBooks.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Recent Books</h2>
            {isOwnProfile && (
              <Link href="/my-books" className="text-blue-400 hover:text-blue-300">
                View all
              </Link>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {recentBooks.map((userBook) => (
              <Link
                key={userBook.id}
                href={`/book/${userBook.books.google_books_id}`}
                className="group"
              >
                <div className="text-center">
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
                  {userBook.rating && (
                    <div className="flex justify-center mt-1">
                      <StarRating rating={userBook.rating} readonly size="sm" />
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {userBooks.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No books yet</h3>
          <p className="text-gray-400">
            {isOwnProfile 
              ? "Start building your library by searching for books!"
              : "This user hasn't added any books to their library yet."
            }
          </p>
          {isOwnProfile && (
            <Link href="/search" className="btn-primary mt-4 inline-block">
              Search Books
            </Link>
          )}
        </div>
      )}
    </div>
  )
} 