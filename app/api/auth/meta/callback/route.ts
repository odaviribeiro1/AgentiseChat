import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import {
  exchangeCodeForToken,
  getLongLivedToken,
  calculateTokenExpiry,
} from '@/lib/meta/oauth'
import { getInstagramProfile, getUserPages, subscribeAppToPage } from '@/lib/meta/instagram'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')
  const errorReason = searchParams.get('error_reason')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!

  // Erro de autorização do usuário (ex: clicou em "Cancelar" ou erro de permissão)
  if (error) {
    console.warn('[OAuth Callback] Erro na autorização:', { error, errorDescription, errorReason })
    
    // Se for um erro do sistema (não cancelamento manual), passar o motivo
    const errorParam = error === 'access_denied' && !errorReason ? 'cancelled' : error
    return NextResponse.redirect(`${appUrl}/conexao?error=${errorParam}`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/conexao?error=invalid_callback`)
  }

  // Verificar state CSRF
  const storedState = request.cookies.get('meta_oauth_state')?.value
  if (!storedState || storedState !== state) {
    console.error('[OAuth Callback] State CSRF inválido')
    return NextResponse.redirect(`${appUrl}/conexao?error=csrf_failed`)
  }

  // Verificar usuário autenticado
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${appUrl}/login`)
  }

  // Trocar code por token de curta duração
  console.log('[OAuth Callback] Trocando code por shortToken...')
  const shortToken = await exchangeCodeForToken(code)
  if (!shortToken) {
    console.error('[OAuth Callback] Falha na troca de code por token')
    return NextResponse.redirect(`${appUrl}/conexao?error=token_exchange_failed`)
  }

  // Converter para token de longa duração (60 dias)
  console.log('[OAuth Callback] Convertendo para longToken...')
  const longTokenResult = await getLongLivedToken(shortToken.access_token)
  if (longTokenResult.error) {
    console.error('[OAuth Callback] Falha ao obter longToken', longTokenResult.error)
    return NextResponse.redirect(`${appUrl}/conexao?error=long_token_failed`)
  }
  const longToken = longTokenResult.data

  // Buscar perfil do Instagram
  console.log('[OAuth Callback] Buscando perfil do Instagram...')
  const profile = await getInstagramProfile(longToken.access_token)
  if (!profile) {
    console.error('[OAuth Callback] Perfil do Instagram não encontrado após busca exaustiva')
    return NextResponse.redirect(`${appUrl}/conexao?error=profile_failed`)
  }

  console.log(`[OAuth Callback] Perfil encontrado: @${profile.username} (ID: ${profile.id})`)

  // 1. Tentar inscrever o app nos webhooks da página vinculada
  console.log('[OAuth Callback] Buscando páginas para inscrição de webhooks...')
  const pages = await getUserPages(longToken.access_token)
  const linkedPage = pages.find(p => p.instagram_business_account?.id === profile.id)
  
  let webhookVerifiedAt: string | null = null
  
  if (linkedPage) {
    console.log(`[OAuth Callback] Página vinculada encontrada: ${linkedPage.name} (${linkedPage.id})`)
    const subResult = await subscribeAppToPage(linkedPage.id, linkedPage.access_token)
    if (subResult.success) {
      webhookVerifiedAt = new Date().toISOString()
    }
  } else {
    console.warn('[OAuth Callback] Nenhuma página vinculada encontrada para este Instagram. Webhooks podem não funcionar.')
  }

  // Salvar/atualizar conta no banco usando service role
  const { encryptToken } = await import('@/lib/crypto/tokens')
  const serviceClient = createServiceClient()
  const { error: dbError } = await serviceClient
    .from('accounts')
    .upsert(
      {
        user_id: user.id,
        instagram_user_id: profile.id,
        instagram_username: profile.username,
        instagram_name: profile.name,
        instagram_pic_url: profile.profile_picture_url ?? null,
        access_token: encryptToken(longToken.access_token),
        token_expires_at: calculateTokenExpiry(longToken.expires_in).toISOString(),
        webhook_verified_at: webhookVerifiedAt,
        is_active: true,
      },
      { onConflict: 'instagram_user_id' }
    )

  if (dbError) {
    console.error('[OAuth Callback] Falha ao salvar conta', dbError)
    return NextResponse.redirect(`${appUrl}/conexao?error=db_failed`)
  }

  // Limpar cookie de state e redirecionar com sucesso
  const response = NextResponse.redirect(`${appUrl}/conexao?success=true`)
  response.cookies.delete('meta_oauth_state')

  return response
}
