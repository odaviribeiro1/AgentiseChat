'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { addTag, removeTag } from '@/app/actions/contacts'

interface TagManagerProps {
  contactId: string
  tags: string[]
}

export function TagManager({ contactId, tags }: TagManagerProps) {
  const [newTag, setNewTag] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAdd = async () => {
    const tag = newTag.trim().toLowerCase()
    if (!tag || tags.includes(tag)) return
    setLoading(true)
    await addTag(contactId, tag)
    setNewTag('')
    setLoading(false)
  }

  const handleRemove = async (tag: string) => {
    setLoading(true)
    await removeTag(contactId, tag)
    setLoading(false)
  }

  return (
    <div>
      <span className="text-[#64748B] block mb-1 text-sm">Tags (Segmentação)</span>
      <div className="flex flex-wrap gap-1 mb-2">
        {tags.length > 0 ? tags.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-[rgba(59,130,246,0.12)] text-[#3B82F6] uppercase border border-[#3B82F6]/20">
            {t}
            <button
              onClick={() => handleRemove(t)}
              disabled={loading}
              className="hover:text-[#EF4444] transition-colors disabled:opacity-50"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )) : (
          <span className="text-[#94A3B8] italic text-xs">Sem tags</span>
        )}
      </div>
      <div className="flex gap-1">
        <input
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Nova tag..."
          className="flex-1 border border-[rgba(59,130,246,0.15)] rounded-lg px-2 py-1 text-xs focus:ring-[#3B82F6] focus:border-[#3B82F6]"
        />
        <button
          onClick={handleAdd}
          disabled={loading || !newTag.trim()}
          className="p-1 bg-[#3B82F6] text-white rounded-lg hover:bg-[#2563EB] disabled:opacity-50 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
