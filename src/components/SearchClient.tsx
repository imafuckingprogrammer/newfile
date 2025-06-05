'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, BookOpen, Users, User, List, Globe, Lock } from 'lucide-react'
import BookSearch from './BookSearch'
import { searchUsers, searchPublicLists } from '@/lib/database'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

interface UserSearchResult {
  id: string
  username: string
  display_name?: string
  avatar_url?: string
}

interface ListSearchResult {
  id: string
  title: string
  description?: string
  is_public: boolean
  created_at: string
  user?: {
    username: string
    display_name?: string
  }
  _count?: {
    list_items: number
  }
}

export default function SearchClient() {
  const [activeTab, setActiveTab] = useState<'books' | 'users' | 'lists'>('books')
  const [userQuery, setUserQuery] = useState('')
  const [listQuery, setListQuery] = useState('')
  const [userResults, setUserResults] = useState<UserSearchResult[]>([])
  const [listResults, setListResults] = useState<ListSearchResult[]>([])
  const [isSearchingUsers, setIsSearchingUsers] = useState(false)
  const [isSearchingLists, setIsSearchingLists] = useState(false)

  const handleUserSearch = async (query: string) => {
    setUserQuery(query)
    
    if (query.trim().length < 2) {
      setUserResults([])
      return
    }

    setIsSearchingUsers(true)
    try {
      const results = await searchUsers(query, { limit: 20 })
      setUserResults(results.users)
    } catch (error) {
      console.error('Error searching users:', error)
      setUserResults([])
    } finally {
      setIsSearchingUsers(false)
    }
  }

  const handleListSearch = async (query: string) => {
    setListQuery(query)
    
    if (query.trim().length < 2) {
      setListResults([])
      return
    }

    setIsSearchingLists(true)
    try {
      const results = await searchPublicLists(query, 20)
      setListResults(results)
    } catch (error) {
      console.error('Error searching lists:', error)
      setListResults([])
    } finally {
      setIsSearchingLists(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">
          Discover & Connect
        </h1>
        <p className="text-gray-300 text-lg">
          Find books to read, readers to follow, and lists to explore
        </p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-800 p-1 rounded-lg max-w-lg mx-auto">
        <button
          onClick={() => setActiveTab('books')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'books'
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          Books
        </button>
        <button
          onClick={() => setActiveTab('lists')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'lists'
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <List className="h-4 w-4" />
          Lists
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'users'
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Users className="h-4 w-4" />
          Users
        </button>
      </div>

      {/* Content */}
      {activeTab === 'books' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div>
            <h2 className="text-2xl font-semibold text-white mb-4 text-center">Search Books</h2>
            <BookSearch placeholder="Search for books by title, author, or ISBN..." />
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="card">
              <h3 className="text-xl font-semibold text-white mb-3">How to Search</h3>
              <ul className="text-gray-300 space-y-2">
                <li>• Type at least 3 characters to start searching</li>
                <li>• Use arrow keys to navigate results</li>
                <li>• Press Enter to view book details</li>
                <li>• Click the action buttons to add to your library</li>
              </ul>
            </div>

            <div className="card">
              <h3 className="text-xl font-semibold text-white mb-3">Quick Actions</h3>
              <ul className="text-gray-300 space-y-2">
                <li>• <span className="text-blue-400">+</span> Want to Read</li>
                <li>• <span className="text-green-400">📖</span> Currently Reading</li>
                <li>• <span className="text-yellow-400">⭐</span> Mark as Read</li>
              </ul>
            </div>

            <div className="card">
              <h3 className="text-xl font-semibold text-white mb-3">Search Tips</h3>
              <ul className="text-gray-300 space-y-2">
                <li>• Search by title, author, or ISBN</li>
                <li>• Use quotes for exact phrases</li>
                <li>• Try different spellings or variations</li>
                <li>• Browse by clicking on book covers</li>
              </ul>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === 'lists' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div>
            <h2 className="text-2xl font-semibold text-white mb-4 text-center">Find Reading Lists</h2>
            
            {/* List Search Input */}
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                value={listQuery}
                onChange={(e) => handleListSearch(e.target.value)}
                placeholder="Search for reading lists by title or description..."
                className="w-full pl-10 pr-4 py-3 bg-surface border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {isSearchingLists && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                </div>
              )}
            </div>
          </div>

          {/* List Results */}
          {listQuery.trim().length >= 2 && (
            <div className="max-w-4xl mx-auto">
              {listResults.length === 0 && !isSearchingLists ? (
                <div className="text-center py-8 card">
                  <List className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400">No lists found for "{listQuery}"</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {listResults.map((list) => (
                    <motion.div
                      key={list.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="card hover:shadow-lg transition-all duration-200 group"
                    >
                      <Link href={`/lists/${list.id}`}>
                        <div>
                          <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors line-clamp-2">
                            {list.title}
                          </h3>
                          {list.description && (
                            <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                              {list.description}
                            </p>
                          )}
                          
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                            <div className="flex items-center gap-2">
                              {list.is_public ? (
                                <>
                                  <Globe className="h-3 w-3" />
                                  Public
                                </>
                              ) : (
                                <>
                                  <Lock className="h-3 w-3" />
                                  Private
                                </>
                              )}
                            </div>
                            <span>{list._count?.list_items || 0} books</span>
                          </div>
                          
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>by {list.user?.display_name || list.user?.username || 'Anonymous'}</span>
                            <span>{formatDate(list.created_at)}</span>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* List Search Tips */}
          {listQuery.trim().length < 2 && (
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <div className="card">
                <h3 className="text-xl font-semibold text-white mb-3">Discover Lists</h3>
                <ul className="text-gray-300 space-y-2">
                  <li>• Find curated book collections</li>
                  <li>• Explore different genres and themes</li>
                  <li>• Get reading recommendations</li>
                  <li>• Follow interesting list creators</li>
                </ul>
              </div>

              <div className="card">
                <h3 className="text-xl font-semibold text-white mb-3">Search Tips</h3>
                <ul className="text-gray-300 space-y-2">
                  <li>• Search by list title or description</li>
                  <li>• Try genre names like "sci-fi" or "romance"</li>
                  <li>• Look for themes like "summer reading"</li>
                  <li>• Browse by clicking on list titles</li>
                </ul>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {activeTab === 'users' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div>
            <h2 className="text-2xl font-semibold text-white mb-4 text-center">Find Users</h2>
            
            {/* User Search Input */}
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                value={userQuery}
                onChange={(e) => handleUserSearch(e.target.value)}
                placeholder="Search for users by username or full name..."
                className="w-full pl-10 pr-4 py-3 bg-surface border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {isSearchingUsers && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                </div>
              )}
            </div>
          </div>

          {/* User Results */}
          {userQuery.trim().length >= 2 && (
            <div className="max-w-2xl mx-auto">
              {userResults.length === 0 && !isSearchingUsers ? (
                <div className="text-center py-8 card">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400">No users found for "{userQuery}"</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {userResults.map((user) => (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="card hover:shadow-lg transition-shadow"
                    >
                      <Link href={`/user/${user.username}`} className="flex items-center gap-4">
                        <div className="flex-shrink-0">
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt={user.display_name || user.username}
                              className="w-12 h-12 rounded-full"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center">
                              <User className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-white">
                            {user.display_name || user.username}
                          </h3>
                          {user.display_name && (
                            <p className="text-gray-400 text-sm">@{user.username}</p>
                          )}
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* User Search Tips */}
          {userQuery.trim().length < 2 && (
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <div className="card">
                <h3 className="text-xl font-semibold text-white mb-3">Connect with Readers</h3>
                <ul className="text-gray-300 space-y-2">
                  <li>• Find users with similar reading tastes</li>
                  <li>• Follow readers for book recommendations</li>
                  <li>• Discover new perspectives and reviews</li>
                  <li>• Build your reading community</li>
                </ul>
              </div>

              <div className="card">
                <h3 className="text-xl font-semibold text-white mb-3">Search Tips</h3>
                <ul className="text-gray-300 space-y-2">
                  <li>• Search by username or display name</li>
                  <li>• Try partial matches</li>
                  <li>• Look for users who review books you like</li>
                  <li>• Check out their reading lists</li>
                </ul>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
} 