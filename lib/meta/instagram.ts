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
 * Requer token de acesso válido.
 */
export async function getInstagramProfile(
  accessToken: string
): Promise<InstagramProfile | null> {
  const { data, error } = await graphApi<InstagramProfile>(
    'me?fields=id,username,name,profile_picture_url,followers_count,media_count',
    { accessToken }
  )

  if (error || !data) {
    console.error('[Instagram] Falha ao buscar perfil', error)
    return null
  }

  return data
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
