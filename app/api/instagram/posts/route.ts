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

  try {
    console.log('[API Posts] Iniciando busca para ID:', account.instagram_user_id)
    
    const { decryptToken } = await import('@/lib/crypto/tokens')
    const decryptedToken = decryptToken(account.access_token)

    const { getInstagramPosts } = await import('@/lib/meta/instagram')
    const posts = await getInstagramPosts(
      account.instagram_user_id,
      decryptedToken
    )

    if (posts.length === 0) {
      console.warn('[API Posts] Nenhum post ou story encontrado. Verificando token...')
    }

    return NextResponse.json({ posts })
  } catch (err: any) {
    console.error('[API Posts] Erro crítico:', err)
    return NextResponse.json({ 
      error: 'Erro ao buscar mídias', 
      details: err.message,
      metaError: err.metaError || null
    }, { status: 500 })
  }
}
