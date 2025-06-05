'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Save, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { updateList, deleteList } from '@/lib/database'

interface List {
  id: string
  title: string
  description?: string
  is_public: boolean
  created_at: string
  updated_at: string
  user_id: string
}

interface ListEditClientProps {
  list: List
}

export default function ListEditClient({ list }: ListEditClientProps) {
  const [title, setTitle] = useState(list.title)
  const [description, setDescription] = useState(list.description || '')
  const [isPublic, setIsPublic] = useState(list.is_public)
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title.trim()) {
      alert('Please enter a title for your list')
      return
    }

    setIsLoading(true)
    try {
      await updateList(list.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        is_public: isPublic
      })
      
      router.push(`/lists/${list.id}`)
    } catch (error: any) {
      console.error('Error updating list:', error)
      alert(error.message || 'Failed to update list')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this list? This action cannot be undone.')) {
      return
    }

    setIsDeleting(true)
    try {
      await deleteList(list.id)
      router.push('/lists')
    } catch (error: any) {
      console.error('Error deleting list:', error)
      alert(error.message || 'Failed to delete list')
      setIsDeleting(false)
    }
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
        Back to List
      </button>

      <div className="card">
        <h1 className="text-3xl font-bold text-white mb-6">Edit List</h1>
        
        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              List Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full input-field"
              placeholder="Enter list title..."
              required
              maxLength={100}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full input-field resize-none"
              rows={4}
              placeholder="Describe your list (optional)..."
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">
              {description.length}/500 characters
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isPublic"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
            />
            <label htmlFor="isPublic" className="text-gray-300">
              Make this list public
            </label>
          </div>
          
          <p className="text-sm text-gray-400">
            {isPublic 
              ? "Public lists can be discovered and viewed by other users" 
              : "Private lists are only visible to you"}
          </p>

          <div className="flex gap-4 pt-6">
            <button
              type="submit"
              disabled={isLoading || !title.trim()}
              className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Save className="h-4 w-4" />
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
            
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {isDeleting ? 'Deleting...' : 'Delete List'}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  )
} 