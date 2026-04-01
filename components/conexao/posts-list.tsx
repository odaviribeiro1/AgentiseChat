'use client'

import { useEffect, useState } from 'react'
import { ExternalLink, Film, Image as ImageIcon, RefreshCw } from 'lucide-react'
import type { InstagramPost } from '@/lib/meta/instagram'

interface PostsListProps {
  accountId: string
}

function PostSkeleton() {
  return (
    <div className="bg-[#F7FAFC] rounded-lg overflow-hidden animate-pulse">
      <div className="aspect-square bg-[#E2E8F0]" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-[#E2E8F0] rounded w-16" />
        <div className="h-3 bg-[#E2E8F0] rounded w-full" />
        <div className="h-3 bg-[#E2E8F0] rounded w-3/4" />
      </div>
    </div>
  )
}

export function PostsList({ accountId }: PostsListProps) {
  const [posts, setPosts] = useState<InstagramPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetchPosts() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/instagram/posts')
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error ?? 'Erro ao buscar posts')
      }
      const json = await res.json()
      setPosts(json.posts ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPosts()
  }, [accountId])

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-[#1A202C]">Posts e Reels</h2>
        {!loading && (
          <button
            onClick={fetchPosts}
            className="flex items-center gap-1.5 text-xs text-[#718096] hover:text-[#2D3748] transition-colors"
          >
            <RefreshCw size={12} />
            Atualizar
          </button>
        )}
      </div>

      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <PostSkeleton key={i} />
          ))}
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center py-8 text-center">
          <p className="text-sm text-[#E53E3E] mb-3">{error}</p>
          <button
            onClick={fetchPosts}
            className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-xs font-medium text-[#718096] hover:bg-[#F7FAFC] transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {!loading && !error && posts.length === 0 && (
        <div className="flex flex-col items-center py-8 text-center">
          <ImageIcon size={32} className="text-[#CBD5E0] mb-2" />
          <p className="text-sm text-[#718096]">Nenhum post encontrado</p>
        </div>
      )}

      {!loading && !error && posts.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {posts.map(post => (
            <div key={post.id} className="rounded-lg border border-[#E2E8F0] overflow-hidden group">
              {/* Thumbnail */}
              <div className="aspect-square bg-[#F7FAFC] relative overflow-hidden">
                {post.thumbnail_url ? (
                  <img
                    src={post.thumbnail_url}
                    alt={post.caption ?? 'Post'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {post.media_product_type === 'REEL' ? (
                      <Film size={24} className="text-[#CBD5E0]" />
                    ) : (
                      <ImageIcon size={24} className="text-[#CBD5E0]" />
                    )}
                  </div>
                )}
                {/* Badge tipo */}
                <span className={`absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-bold text-white ${
                  post.media_product_type === 'REEL' ? 'bg-[#833AB4]' : 'bg-[#2B7FFF]'
                }`}>
                  {post.media_product_type}
                </span>
                {/* Link externo no hover */}
                <a
                  href={post.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ExternalLink size={20} className="text-white" />
                </a>
              </div>

              {/* Info */}
              <div className="p-2.5">
                {post.caption && (
                  <p className="text-xs text-[#2D3748] line-clamp-2 mb-1.5">
                    {post.caption}
                  </p>
                )}
                <div className="flex items-center justify-between text-[10px] text-[#A0AEC0]">
                  <span>
                    {new Date(post.timestamp).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                    })}
                  </span>
                  <div className="flex items-center gap-2">
                    {post.like_count !== undefined && (
                      <span>♥ {post.like_count}</span>
                    )}
                    {post.comments_count !== undefined && (
                      <span>💬 {post.comments_count}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
