import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getListById } from '@/lib/database'
import ListDetailClient from '@/components/ListDetailClient'

interface ListPageProps {
  params: {
    id: string
  }
}

export default async function ListPage({ params }: ListPageProps) {
  const supabase = createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  try {
    const list = await getListById(params.id)
    
    if (!list) {
      notFound()
    }

    // Check if list is public or user owns it
    if (!list.is_public && list.user_id !== user.id) {
      notFound()
    }

    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <ListDetailClient list={list} currentUserId={user.id} />
        </div>
      </div>
    )
  } catch (error) {
    console.error('Error loading list:', error)
    notFound()
  }
} 