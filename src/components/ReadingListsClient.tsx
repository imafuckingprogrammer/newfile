'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, BookOpen, Users, Lock, Globe, Edit, Trash2, Eye, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createReadingList, deleteList } from '@/lib/database'
import { formatDate } from '@/lib/utils'

interface ReadingList {
  id: string
  title: string
  description?: string
  is_public: boolean
  created_at: string
  updated_at: string
  list_items?: Array<{
    id: string
    google_books_id: string
    position: number
  }>
  users?: {
    username?: string
    display_name?: string
  }
}

interface ReadingListsClientProps {
  userLists: ReadingList[]
  publicLists: ReadingList[]
}

export default function ReadingListsClient({ userLists: initialUserLists, publicLists }: ReadingListsClientProps) {
  const [userLists, setUserLists] = useState(initialUserLists)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newListTitle, setNewListTitle] = useState('')
  const [newListDescription, setNewListDescription] = useState('')
  const [newListIsPublic, setNewListIsPublic] = useState(true)
  const router = useRouter()

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newListTitle.trim()) return

    setIsCreating(true)
    try {
      const newList = await createReadingList(newListTitle.trim(), newListDescription.trim() || undefined, newListIsPublic)
      
      // Close modal and reset form
      setShowCreateModal(false)
      setNewListTitle('')
      setNewListDescription('')
      setNewListIsPublic(true)
      
      // Navigate to the new list and auto-open add book interface
      router.push(`/lists/${newList.id}?add=true`)
    } catch (error) {
      console.error('Error creating list:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteList = async (listId: string) => {
    if (!confirm('Are you sure you want to delete this list? This action cannot be undone.')) return

    try {
      await deleteList(listId)
      // Simple page refresh
      window.location.reload()
    } catch (error) {
      console.error('Error deleting list:', error)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Reading Lists</h1>
          <p className="text-gray-300">Organize your books into custom collections</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Create List
        </button>
      </div>

      {/* User's Lists */}
      <div>
        <h2 className="text-2xl font-semibold text-white mb-6">My Lists ({userLists.length})</h2>
        {userLists.length === 0 ? (
          <div className="text-center py-12 card">
            <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No lists yet</h3>
            <p className="text-gray-400 mb-6">
              Create your first reading list to organize your books by theme, genre, or any way you like!
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary"
            >
              Create Your First List
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userLists.map((list) => (
              <motion.div
                key={list.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="card hover:shadow-lg transition-all duration-200 group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <Link href={`/lists/${list.id}`}>
                      <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-blue-400 transition-colors">
                        {list.title}
                      </h3>
                    </Link>
                    {list.description && (
                      <p className="text-gray-400 text-sm mb-2 line-clamp-2">{list.description}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-gray-500">
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
                      <span>•</span>
                      <span>{list.list_items?.length || 0} books</span>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link
                      href={`/lists/${list.id}`}
                      className="p-1 text-gray-400 hover:text-blue-400 transition-colors"
                      title="View List"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                    <Link
                      href={`/lists/${list.id}/edit`}
                      className="p-1 text-gray-400 hover:text-yellow-400 transition-colors"
                      title="Edit List"
                    >
                      <Edit className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={() => handleDeleteList(list.id)}
                      className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                      title="Delete List"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  Created {formatDate(list.created_at)}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Public Lists Discovery */}
      <div>
        <h2 className="text-2xl font-semibold text-white mb-6">Discover Lists</h2>
        {publicLists.length === 0 ? (
          <div className="text-center py-12 card">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No public lists yet</h3>
            <p className="text-gray-400">
              Be the first to create a public list for others to discover!
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {publicLists.map((list) => (
              <motion.div
                key={list.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="card hover:shadow-lg transition-all duration-200 group"
              >
                <Link href={`/lists/${list.id}`}>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-blue-400 transition-colors">
                      {list.title}
                    </h3>
                    {list.description && (
                      <p className="text-gray-400 text-sm mb-2 line-clamp-2">{list.description}</p>
                    )}
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>by {list.users?.display_name || list.users?.username || 'Anonymous'}</span>
                      <span>{list.list_items?.length || 0} books</span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Create List Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowCreateModal(false)
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface rounded-lg p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">Create New List</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateList} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    List Title *
                  </label>
                  <input
                    type="text"
                    value={newListTitle}
                    onChange={(e) => setNewListTitle(e.target.value)}
                    placeholder="e.g., Summer Reading, Sci-Fi Favorites..."
                    className="input-field w-full"
                    required
                    maxLength={100}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Description (optional)
                  </label>
                  <textarea
                    value={newListDescription}
                    onChange={(e) => setNewListDescription(e.target.value)}
                    placeholder="What's this list about?"
                    rows={3}
                    className="input-field w-full resize-none"
                    maxLength={500}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={newListIsPublic}
                    onChange={(e) => setNewListIsPublic(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="isPublic" className="text-sm text-white">
                    Make this list public (others can discover and view it)
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="btn-secondary flex-1"
                    disabled={isCreating}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary flex-1"
                    disabled={isCreating || !newListTitle.trim()}
                  >
                    {isCreating ? 'Creating...' : 'Create List'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
} 