import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getActivityFeed, getRecentReviews } from '@/lib/database'
import SocialFeedClient from '@/components/SocialFeedClient'

export default async function SocialFeedPage() {
  const supabase = createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch activity feed and recent reviews from followed users only
  let activityFeed = []
  let recentReviews = []
  
  try {
    activityFeed = await getActivityFeed(user.id, 20)
  } catch (error) {
    console.error('Error fetching activity feed:', error)
  }
  
  try {
    recentReviews = await getRecentReviews(10, user.id)
  } catch (error) {
    console.error('Error fetching recent reviews:', error)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <SocialFeedClient activityFeed={activityFeed} recentReviews={recentReviews} />
      </div>
    </div>
  )
} 