import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getUserBooks } from '@/lib/database'
import UserProfileClient from '@/components/UserProfileClient'

interface UserProfilePageProps {
  params: {
    username: string
  }
}

export default async function UserProfilePage({ params }: UserProfilePageProps) {
  const supabase = createClient()
  
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()

  if (!currentUser) {
    redirect('/login')
  }

  // Fetch the profile user by username
  const { data: profileUser, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('username', params.username)
    .single()

  if (userError || !profileUser) {
    notFound()
  }

  // Fetch user's public books and reading stats using the fixed function
  let userBooks: any[] = []
  try {
    const allUserBooks = await getUserBooks(profileUser.id)
    userBooks = allUserBooks.slice(0, 20) // Limit to 20 for profile display
  } catch (error) {
    console.error('Error fetching user books:', error)
  }

  // Calculate reading statistics
  const stats = {
    totalBooks: userBooks.length,
    read: userBooks.filter(book => book.status === 'read').length,
    reading: userBooks.filter(book => book.status === 'reading').length,
    averageRating: userBooks.filter(book => book.rating).reduce((acc, book) => acc + book.rating, 0) / (userBooks.filter(book => book.rating).length || 1) || 0,
  }

  // Check if current user follows this profile user
  const { data: followData } = await supabase
    .from('follows')
    .select('*')
    .eq('follower_id', currentUser.id)
    .eq('following_id', profileUser.id)
    .single()

  const isFollowing = !!followData

  // Get follower/following counts
  const { count: followersCount } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', profileUser.id)

  const { count: followingCount } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', profileUser.id)

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <UserProfileClient 
          profileUser={profileUser}
          userBooks={userBooks}
          stats={stats}
          isOwnProfile={currentUser.id === profileUser.id}
          isFollowing={isFollowing}
          followersCount={followersCount || 0}
          followingCount={followingCount || 0}
        />
      </div>
    </div>
  )
} 