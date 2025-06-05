import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createClient()
    const { userBookId } = await request.json()

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if the user has already liked this user_book review
    const { data: existingLike } = await supabase
      .from('review_likes')
      .select()
      .eq('user_id', user.id)
      .eq('user_book_id', userBookId)
      .single()

    if (existingLike) {
      // Unlike if already liked
      const { error: deleteError } = await supabase
        .from('review_likes')
        .delete()
        .eq('user_id', user.id)
        .eq('user_book_id', userBookId)

      if (deleteError) {
        throw deleteError
      }
    } else {
      // Add new like
      const { error: insertError } = await supabase
        .from('review_likes')
        .insert({
          user_id: user.id,
          user_book_id: userBookId
        })

      if (insertError) {
        throw insertError
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error handling review like:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 