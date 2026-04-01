import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

  const { decryptToken } = await import('@/lib/crypto/tokens')
  const decryptedToken = decryptToken(account.access_token)

  // Validar token antes de chamadas caras
  const { validateToken, getInstagramPosts } = await import('@/lib/meta/instagram')
  const isValid = await validateToken(decryptedToken)
  if (!isValid) {
    return NextResponse.json(
      { error: 'Token do Instagram inválido ou expirado. Reconecte sua conta em Configurações → Conexão.' },
      { status: 401 }
    )
  }

  console.log('[API Posts] Iniciando busca para ID:', account.instagram_user_id)

  const { posts, error } = await getInstagramPosts(account.instagram_user_id, decryptedToken)

  if (error) {
    console.error('[API Posts] Erro ao buscar mídias:', error)
    return NextResponse.json(
      { error: `Erro ao buscar mídias do Instagram: ${error}` },
      { status: 502 }
    )
  }

  return NextResponse.json({ posts })
}
