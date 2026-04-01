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
 * Busca os posts e reels mais recentes da conta.
 * Usado para selecionar o post no trigger da automação.
 */
export async function getInstagramPosts(
  instagramUserId: string,
  accessToken: string,
  limit = 20
): Promise<InstagramPost[]> {
  const fields = 'id,caption,media_type,media_product_type,thumbnail_url,permalink,timestamp,like_count,comments_count'

  const { data, error } = await graphApi<{ data: InstagramPost[] }>(
    `${instagramUserId}/media?fields=${fields}&limit=${limit}`,
    { accessToken }
  )

  if (error || !data) {
    console.error('[Instagram] Falha ao buscar posts', error)
    return []
  }

  // Filtrar apenas posts e reels (excluir stories)
  return data.data.filter(
    p => p.media_product_type === 'POST' || p.media_product_type === 'REEL'
  )
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
