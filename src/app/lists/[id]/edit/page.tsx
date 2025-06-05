import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getListById } from '@/lib/database'
import ListEditClient from '@/components/ListEditClient'

interface ListEditPageProps {
  params: {
    id: string
  }
}

export default async function ListEditPage({ params }: ListEditPageProps) {
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

    // Only the owner can edit the list
    if (list.user_id !== user.id) {
      redirect(`/lists/${params.id}`)
    }

    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <ListEditClient list={list} />
        </div>
      </div>
    )
  } catch (error) {
    console.error('Error loading list:', error)
    notFound()
  }
} 