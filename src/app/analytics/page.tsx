import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getReadingAnalytics, getReadingGoals } from '@/lib/database'
import AnalyticsClient from '@/components/AnalyticsClient'

export default async function AnalyticsPage() {
  const supabase = createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch analytics data
  let analytics = null
  let goals = null
  
  try {
    analytics = await getReadingAnalytics(user.id)
  } catch (error) {
    console.error('Error fetching analytics:', error)
  }
  
  try {
    goals = await getReadingGoals(user.id)
  } catch (error) {
    console.error('Error fetching goals:', error)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <AnalyticsClient analytics={analytics} goals={goals} />
      </div>
    </div>
  )
} 