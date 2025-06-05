import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getUserLists, getPublicLists } from '@/lib/database'
import ReadingListsClient from '@/components/ReadingListsClient'

export default async function ReadingListsPage() {
  const supabase = createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user's lists and public lists
  let userLists = []
  let publicLists = []
  
  try {
    userLists = await getUserLists(user.id)
  } catch (error) {
    console.error('Error fetching user lists:', error)
  }
  
  try {
    publicLists = await getPublicLists(12)
  } catch (error) {
    console.error('Error fetching public lists:', error)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <ReadingListsClient userLists={userLists} publicLists={publicLists} />
      </div>
    </div>
  )
} 