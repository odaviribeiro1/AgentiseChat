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
      <div className="aspect-square bg-[rgba(59,130,246,0.15)]" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-[rgba(59,130,246,0.15)] rounded w-16" />
        <div className="h-3 bg-[rgba(59,130,246,0.15)] rounded w-full" />
        <div className="h-3 bg-[rgba(59,130,246,0.15)] rounded w-3/4" />
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
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-[#F8FAFC]">Posts e Reels</h2>
        {!loading && (
          <button
            onClick={fetchPosts}
            className="flex items-center gap-1.5 text-xs text-[#94A3B8] hover:text-[#CBD5E1] transition-colors"
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
          <p className="text-sm text-[#EF4444] mb-3">{error}</p>
          <button
            onClick={fetchPosts}
            className="px-4 py-2 rounded-lg border border-[rgba(59,130,246,0.15)] text-xs font-medium text-[#94A3B8] hover:bg-[#F7FAFC] transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {!loading && !error && posts.length === 0 && (
        <div className="flex flex-col items-center py-8 text-center">
          <ImageIcon size={32} className="text-[rgba(59,130,246,0.2)] mb-2" />
          <p className="text-sm text-[#94A3B8]">Nenhum post encontrado</p>
        </div>
      )}

      {!loading && !error && posts.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {posts.map(post => (
            <div key={post.id} className="rounded-lg border border-[rgba(59,130,246,0.15)] overflow-hidden group">
              {/* Thumbnail */}
              <div className="aspect-square bg-[#F7FAFC] relative overflow-hidden">
                {post.thumbnail_url ? (
                  <img
                    src={post.thumbnail_url || post.media_url}
                    alt={post.caption ?? 'Post'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {post.media_product_type === 'REEL' ? (
                      <Film size={24} className="text-[rgba(59,130,246,0.2)]" />
                    ) : (
                      <ImageIcon size={24} className="text-[rgba(59,130,246,0.2)]" />
                    )}
                  </div>
                )}
                {/* Badge tipo */}
                <span className={`absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-bold text-white ${
                  post.media_product_type === 'REEL' ? 'bg-[#833AB4]' : 'bg-[#3B82F6]'
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
                  <p className="text-xs text-[#CBD5E1] line-clamp-2 mb-1.5">
                    {post.caption}
                  </p>
                )}
                <div className="flex items-center justify-between text-[10px] text-[#64748B]">
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
