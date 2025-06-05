'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { User, Save, Camera, ArrowLeft } from 'lucide-react'
import { updateUserProfile } from '@/lib/database'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface ProfileSettingsClientProps {
  user: any
  userProfile: any
}

export default function ProfileSettingsClient({ user, userProfile }: ProfileSettingsClientProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    display_name: userProfile?.display_name || '',
    bio: userProfile?.bio || '',
    avatar_url: userProfile?.avatar_url || '',
  })
  const [message, setMessage] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage('')

    try {
      console.log('Submitting profile update:', formData)
      
      const updatedProfile = await updateUserProfile({
        display_name: formData.display_name.trim() || null,
        bio: formData.bio.trim() || null,
        avatar_url: formData.avatar_url.trim() || null,
      })

      console.log('Profile update successful:', updatedProfile)
      setMessage('Profile updated successfully!')
      
      setTimeout(() => {
        router.push(`/user/${userProfile?.username}`)
      }, 1500)
    } catch (error) {
      console.error('Error updating profile:', error)
      setMessage(`Failed to update profile: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/user/${userProfile?.username}`}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Profile
        </Link>
      </div>

      <div>
        <h1 className="text-4xl font-bold text-white mb-2">Profile Settings</h1>
        <p className="text-gray-300">Update your profile information and preferences</p>
      </div>

      {/* Profile Form */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Avatar Section */}
        <div className="lg:col-span-1">
          <div className="card text-center">
            <h3 className="text-xl font-semibold text-white mb-4">Profile Picture</h3>
            <div className="mb-4">
              {formData.avatar_url ? (
                <img
                  src={formData.avatar_url}
                  alt="Profile"
                  className="w-32 h-32 rounded-full mx-auto object-cover"
                />
              ) : (
                <div className="w-32 h-32 bg-gray-600 rounded-full mx-auto flex items-center justify-center">
                  <User className="h-16 w-16 text-gray-400" />
                </div>
              )}
            </div>
            <div className="space-y-3">
              <input
                type="url"
                name="avatar_url"
                value={formData.avatar_url}
                onChange={handleInputChange}
                placeholder="Avatar URL"
                className="input-field w-full text-sm"
              />
              <p className="text-gray-400 text-xs">
                Enter a URL to your profile picture
              </p>
            </div>
          </div>
        </div>

        {/* Form Section */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="card space-y-6">
            <h3 className="text-xl font-semibold text-white mb-4">Profile Information</h3>
            
            {/* Username (read-only) */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Username
              </label>
              <input
                type="text"
                value={userProfile?.username || ''}
                disabled
                className="input-field w-full opacity-50 cursor-not-allowed"
              />
              <p className="text-gray-400 text-xs mt-1">
                Username cannot be changed
              </p>
            </div>

            {/* Email (read-only) */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Email
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="input-field w-full opacity-50 cursor-not-allowed"
              />
              <p className="text-gray-400 text-xs mt-1">
                Email cannot be changed here
              </p>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Display Name
              </label>
              <input
                type="text"
                name="display_name"
                value={formData.display_name}
                onChange={handleInputChange}
                placeholder="Enter your display name"
                className="input-field w-full"
                maxLength={100}
              />
              <p className="text-gray-400 text-xs mt-1">
                This is how your name will appear to other users
              </p>
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Bio
              </label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                placeholder="Tell us about yourself and your reading interests..."
                rows={4}
                className="input-field w-full resize-none"
                maxLength={500}
              />
              <div className="flex justify-between text-xs mt-1">
                <p className="text-gray-400">
                  Share your reading interests, favorite genres, or anything about yourself
                </p>
                <p className="text-gray-400">
                  {formData.bio.length}/500
                </p>
              </div>
            </div>

            {/* Message */}
            {message && (
              <div className={`p-3 rounded-lg text-sm ${
                message.includes('successfully') 
                  ? 'bg-green-900 text-green-300' 
                  : 'bg-red-900 text-red-300'
              }`}>
                {message}
              </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4" />
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
              
              <Link
                href={`/user/${userProfile?.username}`}
                className="btn-secondary flex items-center gap-2"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>

      {/* Additional Settings */}
      <div className="card">
        <h3 className="text-xl font-semibold text-white mb-4">Account Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
            <div>
              <h4 className="text-white font-medium">Change Password</h4>
              <p className="text-gray-400 text-sm">Update your account password</p>
            </div>
            <button className="btn-secondary text-sm">
              Change Password
            </button>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
            <div>
              <h4 className="text-white font-medium">Privacy Settings</h4>
              <p className="text-gray-400 text-sm">Manage your profile visibility</p>
            </div>
            <button className="btn-secondary text-sm">
              Manage Privacy
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
} 