import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getLongLivedToken, calculateTokenExpiry } from '@/lib/meta/oauth'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { data: account } = await supabase
    .from('accounts')
    .select('id, access_token')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!account) {
    return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 })
  }

  const { decryptToken, encryptToken } = await import('@/lib/crypto/tokens')
  const plainToken = decryptToken(account.access_token)
  const newToken = await getLongLivedToken(plainToken)
  if (!newToken) {
    return NextResponse.json({ error: 'Falha ao renovar token' }, { status: 500 })
  }

  const expiresAt = calculateTokenExpiry(newToken.expires_in)

  const serviceClient = createServiceClient()
  const { error: dbError } = await serviceClient
    .from('accounts')
    .update({
      access_token: encryptToken(newToken.access_token),
      token_expires_at: expiresAt.toISOString(),
    })
    .eq('id', account.id)

  if (dbError) {
    console.error('[Token Refresh] Falha ao atualizar token', dbError)
    return NextResponse.json({ error: 'Falha ao salvar token' }, { status: 500 })
  }

  return NextResponse.json({ success: true, expires_at: expiresAt })
}
