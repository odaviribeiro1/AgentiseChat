import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getInstagramPosts } from '@/lib/meta/instagram'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { data: account } = await supabase
    .from('accounts')
    .select('instagram_user_id, access_token')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!account) {
    return NextResponse.json({ error: 'Nenhuma conta conectada' }, { status: 404 })
  }

  const posts = await getInstagramPosts(
    account.instagram_user_id,
    account.access_token
  )

  return NextResponse.json({ posts })
}
