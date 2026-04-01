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

  console.log('[API Posts] Iniciando busca para ID:', account.instagram_user_id)
  
  const { decryptToken } = await import('@/lib/crypto/tokens')
  const decryptedToken = decryptToken(account.access_token)

  const { getInstagramPosts } = await import('@/lib/meta/instagram')
  const posts = await getInstagramPosts(
    account.instagram_user_id,
    decryptedToken
  )

  console.log(`[API Posts] Sucesso! Encontrados ${posts.length} posts.`)

  return NextResponse.json({ posts })
}
