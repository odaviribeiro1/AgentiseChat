const OAUTH_BASE = 'https://www.facebook.com/v21.0/dialog/oauth'
const TOKEN_URL = 'https://graph.facebook.com/v21.0/oauth/access_token'
const LONG_LIVED_URL = 'https://graph.facebook.com/v21.0/oauth/access_token'

// Permissões necessárias para a plataforma
const REQUIRED_SCOPES = [
  'instagram_basic',
  'instagram_manage_comments',
  'instagram_manage_messages',
  'pages_manage_metadata',
  'pages_read_engagement',
].join(',')

/**
 * Gera a URL de autorização OAuth da Meta.
 * O usuário é redirecionado para esta URL para autorizar o app.
 */
export function buildOAuthUrl(state: string): string {
  const appId = process.env.META_APP_ID
  const configId = process.env.META_CONFIG_ID
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const redirectUri = process.env.META_REDIRECT_URI || `${appUrl}/api/auth/meta/callback`

  console.log('[OAuth] Depuração:', {
    hasAppId: !!appId,
    appIdLength: appId?.length,
    appIdPrefix: appId?.substring(0, 4),
    hasConfigId: !!configId,
  })

  if (!appId) {
    throw new Error('META_APP_ID não encontrada nas variáveis de ambiente')
  }

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    scope: REQUIRED_SCOPES,
    response_type: 'code',
    state,                          // CSRF protection
  })

  // Facebook Login for Business exige config_id
  if (configId) {
    params.append('config_id', configId)
  }

  const url = `${OAUTH_BASE}?${params.toString()}`
  return url
}

/**
 * Troca o code de autorização por access token de curta duração.
 */
export async function exchangeCodeForToken(code: string): Promise<{
  access_token: string
  token_type: string
} | null> {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    client_secret: process.env.META_APP_SECRET!,
    redirect_uri: process.env.META_REDIRECT_URI!,
    code,
  })

  try {
    const response = await fetch(`${TOKEN_URL}?${params.toString()}`)
    if (!response.ok) {
      const error = await response.json()
      console.error('[OAuth] Falha ao trocar code por token', error)
      return null
    }
    return response.json()
  } catch (err) {
    console.error('[OAuth] Erro na troca de token', err)
    return null
  }
}

/**
 * Converte token de curta duração (1h) em token de longa duração (60 dias).
 * SEMPRE fazer esta conversão após o OAuth.
 */
export async function getLongLivedToken(shortToken: string): Promise<{
  access_token: string
  token_type: string
  expires_in: number              // segundos até expirar (~5184000 = 60 dias)
} | null> {
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: process.env.META_APP_ID!,
    client_secret: process.env.META_APP_SECRET!,
    fb_exchange_token: shortToken,
  })

  try {
    const response = await fetch(`${LONG_LIVED_URL}?${params.toString()}`)
    if (!response.ok) {
      const error = await response.json()
      console.error('[OAuth] Falha ao obter token de longa duração', error)
      return null
    }
    return response.json()
  } catch (err) {
    console.error('[OAuth] Erro ao obter token de longa duração', err)
    return null
  }
}

/**
 * Calcula a data de expiração do token.
 */
export function calculateTokenExpiry(expiresInSeconds: number): Date {
  return new Date(Date.now() + expiresInSeconds * 1000)
}

