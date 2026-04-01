'use client'

import { useEffect, useState } from 'react'
import { InstagramPost } from '@/lib/meta/instagram'
import { RefreshCw, Hash, Image as ImageIcon, CheckCircle2 } from 'lucide-react'

interface TriggerFormProps {
  initialConfig: {
    keywords: string[]
    match_type: 'contains' | 'exact' | 'any'
    apply_to: 'all_posts' | 'specific_post'
    post_id: string | null
  }
  onChange: (config: any) => void
}

export function TriggerForm({ initialConfig, onChange }: TriggerFormProps) {
  const [posts, setPosts] = useState<InstagramPost[]>([])
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [keywordInput, setKeywordInput] = useState('')

  const fetchPosts = async () => {
    setLoadingPosts(true)
    setFetchError(null)
    try {
      const res = await fetch('/api/instagram/posts')
      const json = await res.json()
      if (!res.ok) {
        setFetchError(json.error || `Erro ${res.status} ao buscar posts`)
        setPosts([])
        return
      }
      setPosts(json.posts || [])
    } catch (e) {
      setFetchError('Erro de rede ao buscar posts do Instagram')
    } finally {
      setLoadingPosts(false)
    }
  }

  useEffect(() => {
    fetchPosts()
  }, [])

  const addKeyword = () => {
    if (!keywordInput.trim()) return
    const newKeywords = [...(initialConfig.keywords || []), keywordInput.trim()]
    onChange({ ...initialConfig, keywords: newKeywords })
    setKeywordInput('')
  }

  const removeKeyword = (index: number) => {
    const newKeywords = (initialConfig.keywords || []).filter((_, i) => i !== index)
    onChange({ ...initialConfig, keywords: newKeywords })
  }

  return (
    <div className="space-y-6">
      {/* Seletor de Modo de Gatilho */}
      <div className="p-4 bg-[#F8F9FB] rounded-xl border border-[#E2E8F0]">
        <label className="block text-sm font-semibold text-[#1A202C] mb-3">Como o robô deve disparar?</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onChange({ ...initialConfig, match_type: 'contains' })}
            className={`px-3 py-2 text-xs font-bold rounded-lg border-2 transition-all ${
              initialConfig.match_type !== 'any' 
                ? 'bg-white border-[#2B7FFF] text-[#2B7FFF]' 
                : 'bg-transparent border-transparent text-[#718096] hover:bg-white/50'
            }`}
          >
            Palavras-Chave
          </button>
          <button
            onClick={() => onChange({ ...initialConfig, match_type: 'any' })}
            className={`px-3 py-2 text-xs font-bold rounded-lg border-2 transition-all ${
              initialConfig.match_type === 'any' 
                ? 'bg-white border-[#2B7FFF] text-[#2B7FFF]' 
                : 'bg-transparent border-transparent text-[#718096] hover:bg-white/50'
            }`}
          >
            Qualquer Interação
          </button>
        </div>
      </div>

      {/* Seção de Palavras-Chave (Condicional) */}
      {initialConfig.match_type !== 'any' && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
          <label className="block text-sm font-semibold text-[#1A202C] mb-2 flex items-center gap-2">
            <Hash className="w-4 h-4 text-[#2B7FFF]" />
            Palavras-Chave de Comentário
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
              placeholder="Ex: QUERO, INFO..."
              className="flex-1 px-3 py-2 text-sm bg-[#F8F9FB] border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#2B7FFF]/20 outline-none"
            />
            <button
              onClick={addKeyword}
              className="px-4 py-2 bg-[#F0F2F5] text-[#4A5568] hover:bg-[#E2E8F0] rounded-lg text-sm font-bold transition-colors"
            >
              Adicionar
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(initialConfig.keywords || []).map((kw, i) => (
              <span key={i} className="px-2 py-1 bg-[#EBF3FF] text-[#2B7FFF] text-xs font-bold rounded-md flex items-center gap-1.5 border border-[#2B7FFF]/10">
                {kw}
                <button onClick={() => removeKeyword(i)} className="hover:text-red-500 font-normal">×</button>
              </span>
            ))}
            {(initialConfig.keywords || []).length === 0 && (
              <p className="text-[11px] text-[#A0AEC0]">Insira as palavras que o robô deve identificar nos comentários.</p>
            )}
          </div>
        </div>
      )}

      {/* Feedback para Modo 'Any' */}
      {initialConfig.match_type === 'any' && (
        <div className="p-4 bg-green-50 border border-green-100 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
           <p className="text-xs text-green-700 leading-relaxed font-medium">
             ✨ <strong>Modo Gatilho Universal Ativado:</strong> O robô responderá a qualquer comentário ou reação no post/story selecionado abaixo.
           </p>
        </div>
      )}

      {/* Seção de Seleção de Post */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-semibold text-[#1A202C] flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-[#2B7FFF]" />
            Post Específico
          </label>
          <button onClick={fetchPosts} className="text-[#A0AEC0] hover:text-[#2B7FFF] transition-colors">
            <RefreshCw className={`w-3 h-3 ${loadingPosts ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto p-1 bg-[#F8F9FB] rounded-xl border border-[#E2E8F0]">
          {posts.map((post) => {
            const isSelected = initialConfig.post_id === post.id
            return (
              <button
                key={post.id}
                onClick={() => onChange({ ...initialConfig, apply_to: 'specific_post', post_id: post.id })}
                className={`relative group rounded-lg overflow-hidden aspect-square border-2 transition-all ${
                  isSelected ? 'border-[#2B7FFF] ring-2 ring-[#2B7FFF]/20' : 'border-transparent opacity-70 hover:opacity-100 hover:border-[#E2E8F0]'
                }`}
              >
                <img
                  src={post.thumbnail_url || post.media_url}
                  alt={post.caption || 'Post'}
                  className="w-full h-full object-cover"
                />
                {/* Badge tipo */}
                <span className={`absolute top-2 left-2 px-1.5 py-0.5 rounded text-[8px] font-bold text-white shadow-sm z-10 ${
                  post.media_product_type === 'STORY' ? 'bg-gradient-to-tr from-[#F9ED32] via-[#EE2A7B] to-[#D22A8A]' :
                  post.media_product_type === 'REEL' ? 'bg-[#833AB4]' : 'bg-[#2B7FFF]'
                }`}>
                  {post.media_product_type}
                </span>

                {isSelected && (
                  <div className="absolute top-2 right-2 z-10 shadow-sm border-2 border-white rounded-full">
                    <CheckCircle2 className="w-5 h-5 text-[#2B7FFF] fill-white" />
                  </div>
                )}
                <div className="absolute bottom-0 inset-x-0 p-1.5 bg-gradient-to-t from-black/80 to-transparent z-0">
                  <p className="text-[9px] text-white truncate leading-tight font-medium">{post.caption || 'Sem legenda'}</p>
                </div>
              </button>
            )
          })}
          {fetchError && !loadingPosts && (
            <div className="col-span-2 py-6 flex flex-col items-center justify-center text-center px-3">
              <ImageIcon className="w-7 h-7 mb-2 text-[#E53E3E] opacity-60" />
              <p className="text-xs font-semibold text-[#E53E3E] mb-1">Não foi possível carregar os posts</p>
              <p className="text-[11px] text-[#718096]">{fetchError}</p>
              <button onClick={fetchPosts} className="mt-3 text-[11px] font-bold text-[#2B7FFF] hover:underline">
                Tentar novamente
              </button>
            </div>
          )}
          {!fetchError && posts.length === 0 && !loadingPosts && (
            <div className="col-span-2 py-8 flex flex-col items-center justify-center text-[#A0AEC0]">
              <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-xs">Nenhum post encontrado para selecionar.</p>
            </div>
          )}
          {loadingPosts && (
            <div className="col-span-2 py-8 text-center text-xs text-[#A0AEC0]">Carregando posts do Instagram...</div>
          )}
        </div>
      </div>
    </div>
  )
}
