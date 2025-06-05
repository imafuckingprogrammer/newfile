import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SearchClient from '@/components/SearchClient'

export default async function SearchPage() {
  const supabase = createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <SearchClient />
      </div>
    </div>
  )
} 