'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function DebugReviews() {
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchDebugInfo = async () => {
      try {
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError) throw userError

        // Get a sample review
        const { data: reviews, error: reviewError } = await supabase
          .from('user_books')
          .select('*')
          .not('review_text', 'is', null)
          .limit(1)
          .single()
        if (reviewError) throw reviewError

        // Get likes for the review
        const { data: likes, error: likesError } = await supabase
          .from('review_likes')
          .select('*')
          .eq('user_book_id', reviews.id)
        if (likesError) throw likesError

        // Get comments for the review
        const { data: comments, error: commentsError } = await supabase
          .from('review_comments')
          .select('*')
          .eq('user_book_id', reviews.id)
        if (commentsError) throw commentsError

        // Get table information
        const { data: tables, error: tablesError } = await supabase
          .from('information_schema.tables')
          .select('table_name')
          .eq('table_schema', 'public')
        if (tablesError) throw tablesError

        setDebugInfo({
          currentUser: user,
          sampleReview: reviews,
          reviewLikes: likes,
          reviewComments: comments,
          tables: tables
        })
      } catch (err: any) {
        setError(err.message)
      }
    }

    fetchDebugInfo()
  }, [])

  const handleTestLike = async () => {
    if (!debugInfo?.sampleReview?.id) return
    
    try {
      const response = await fetch('/api/reviews/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId: debugInfo.sampleReview.id })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to like review')
      }
      
      // Refresh debug info
      window.location.reload()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleTestComment = async () => {
    if (!debugInfo?.sampleReview?.id) return
    
    try {
      const response = await fetch('/api/reviews/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewId: debugInfo.sampleReview.id,
          content: 'Test comment from debug page'
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add comment')
      }
      
      // Refresh debug info
      window.location.reload()
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Reviews Debug Page</h1>
      
      {error && (
        <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 mb-8">
          <h2 className="text-red-500 font-semibold mb-2">Error</h2>
          <pre className="text-red-400 whitespace-pre-wrap">{error}</pre>
        </div>
      )}

      <div className="space-y-4">
        <button
          onClick={handleTestLike}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg mr-4"
        >
          Test Like API
        </button>
        
        <button
          onClick={handleTestComment}
          className="px-4 py-2 bg-green-500 text-white rounded-lg"
        >
          Test Comment API
        </button>
      </div>

      <div className="mt-8 space-y-8">
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Available Tables</h2>
          <pre className="bg-gray-800 p-4 rounded-lg overflow-auto">
            {JSON.stringify(debugInfo?.tables, null, 2)}
          </pre>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Current User</h2>
          <pre className="bg-gray-800 p-4 rounded-lg overflow-auto">
            {JSON.stringify(debugInfo?.currentUser, null, 2)}
          </pre>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Sample Review</h2>
          <pre className="bg-gray-800 p-4 rounded-lg overflow-auto">
            {JSON.stringify(debugInfo?.sampleReview, null, 2)}
          </pre>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Review Likes</h2>
          <pre className="bg-gray-800 p-4 rounded-lg overflow-auto">
            {JSON.stringify(debugInfo?.reviewLikes, null, 2)}
          </pre>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Review Comments</h2>
          <pre className="bg-gray-800 p-4 rounded-lg overflow-auto">
            {JSON.stringify(debugInfo?.reviewComments, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
} 