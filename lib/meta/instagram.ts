import { graphApi } from './client'

export interface InstagramProfile {
  id: string
  username: string
  name: string
  profile_picture_url?: string
  followers_count?: number
  media_count?: number
}

export interface InstagramPost {
  id: string
  caption?: string
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
  media_product_type: 'POST' | 'REEL' | 'STORY'
  thumbnail_url?: string
  media_url?: string
  permalink: string
  timestamp: string
  like_count?: number
  comments_count?: number
}

/**
 * Busca o perfil da conta Instagram Business conectada.
 * Lógica robusta: Busca as páginas do usuário e identifica a conta do Instagram vinculada.
 */
export async function getInstagramProfile(
  accessToken: string
): Promise<InstagramProfile | null> {
  console.log('[Instagram] Iniciando busca de perfil...')

  // 1. Buscar as páginas (Accounts) do usuário
  const { data: accountsData, error: accountsError } = await graphApi<{ data: any[] }>(
    'me/accounts?fields=id,name,access_token',
    { accessToken }
  )

  if (accountsError || !accountsData?.data?.length) {
    console.error('[Instagram] Falha ao buscar páginas do Facebook ou nenhuma página encontrada', accountsError)
    // Tenta fallback direto no /me (pode funcionar em alguns casos de permissão legada)
    const { data: meData } = await graphApi<InstagramProfile>(
      'me?fields=id,username,name,profile_picture_url',
      { accessToken }
    )
    return meData
  }

  console.log(`[Instagram] ${accountsData.data.length} páginas encontradas. Buscando IG Business Account...`)

  // 2. Para cada página, buscar o instagram_business_account vinculado
  for (const page of accountsData.data) {
    const { data: pageData } = await graphApi<{ instagram_business_account?: { id: string } }>(
      `${page.id}?fields=instagram_business_account`,
      { accessToken }
    )

    if (pageData?.instagram_business_account?.id) {
      const igId = pageData.instagram_business_account.id
      console.log(`[Instagram] Conta Business encontrada: ${igId}. Buscando detalhes...`)

      // 3. Buscar os detalhes da conta do Instagram
      const { data: igProfile, error: igError } = await graphApi<InstagramProfile>(
        `${igId}?fields=id,username,name,profile_picture_url,followers_count,media_count`,
        { accessToken }
      )

      if (igProfile) {
        return igProfile
      }
    }
  }

  console.error('[Instagram] Nenhuma conta de Instagram Business vinculada às páginas do Facebook foi encontrada.')
  return null
}

/**
 * Busca os posts e reels mais recentes da conta, além de stories ativos.
 * Usado para selecionar o post no trigger da automação.
 */
export async function getInstagramPosts(
  instagramUserId: string,
  accessToken: string,
  limit = 20
): Promise<{ posts: InstagramPost[]; error: string | null }> {
  const fields = 'id,caption,media_type,media_product_type,thumbnail_url,media_url,permalink,timestamp,like_count,comments_count'

  console.log(`[Instagram] Buscando mídias para ID ${instagramUserId}...`)

  // 1. Buscar Posts e Reels da feed
  const { data: mediaData, error: mediaError } = await graphApi<{ data: InstagramPost[] }>(
    `${instagramUserId}/media?fields=${fields}&limit=${limit}`,
    { accessToken }
  )

  if (mediaError) {
    console.error('[Instagram] Falha ao buscar media (feed)', mediaError)
    return { posts: [], error: mediaError }
  }

  // 2. Buscar Stories ativos (falha não-fatal — stories podem estar vazios)
  const { data: storiesData, error: storiesError } = await graphApi<{ data: InstagramPost[] }>(
    `${instagramUserId}/stories?fields=${fields}&limit=10`,
    { accessToken }
  )

  if (storiesError) {
    console.warn('[Instagram] Falha ao buscar stories (comum se não houver stories ativos)', storiesError)
  }

  const allMedia = [...(mediaData?.data || []), ...(storiesData?.data || [])]

  // Ordenar por data (mais recente primeiro)
  return {
    posts: allMedia.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ),
    error: null,
  }
}

export interface PageAccount {
  id: string
  name: string
  access_token: string
  instagram_business_account?: {
    id: string
  }
}

/**
 * Busca todas as páginas do Facebook do usuário e seus respectivos tokens.
 */
export async function getUserPages(accessToken: string): Promise<PageAccount[]> {
  const { data, error } = await graphApi<{ data: PageAccount[] }>(
    'me/accounts?fields=id,name,access_token,instagram_business_account',
    { accessToken }
  )

  if (error || !data) {
    console.error('[Instagram] Falha ao buscar páginas do usuário', error)
    return []
  }

  return data.data || []
}

/**
 * Inscreve o App para receber webhooks de uma página específica.
 * Essencial para que o Meta envie eventos de mensagens e comentários.
 */
export async function subscribeAppToPage(
  pageId: string,
  pageAccessToken: string
): Promise<{ success: boolean; error?: string }> {
  console.log(`[Instagram] Inscrevendo App na página ${pageId}...`)

  const { data, error, status } = await graphApi<{ success: boolean }>(
    `${pageId}/subscribed_apps`,
    {
      method: 'POST',
      accessToken: pageAccessToken,
      body: {
        subscribed_fields: [
          'feed',
        ].join(',')
      }
    }
  )

  if (error || !data?.success) {
    console.error(`[Instagram] Falha ao inscrever App na página ${pageId}`, { error, status })
    return { success: false, error: error ?? `HTTP ${status}` }
  }

  console.log(`[Instagram] App inscrito com sucesso na página ${pageId}`)
  return { success: true }
}

/**
 * Verifica se o token ainda é válido consultando a API.
 * Retorna true se válido, false se expirado ou inválido.
 */
export async function validateToken(accessToken: string): Promise<boolean> {
  const { data, error } = await graphApi<{ id: string }>(
    'me?fields=id',
    { accessToken }
  )
  return !error && !!data?.id
}
