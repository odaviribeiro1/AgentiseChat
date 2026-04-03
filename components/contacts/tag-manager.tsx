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
      <span className="text-[#A0AEC0] block mb-1 text-sm">Tags (Segmentação)</span>
      <div className="flex flex-wrap gap-1 mb-2">
        {tags.length > 0 ? tags.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#EBF3FF] text-[#2B7FFF] uppercase border border-[#2B7FFF]/20">
            {t}
            <button
              onClick={() => handleRemove(t)}
              disabled={loading}
              className="hover:text-[#E53E3E] transition-colors disabled:opacity-50"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )) : (
          <span className="text-[#718096] italic text-xs">Sem tags</span>
        )}
      </div>
      <div className="flex gap-1">
        <input
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Nova tag..."
          className="flex-1 border border-[#E2E8F0] rounded-lg px-2 py-1 text-xs focus:ring-[#2B7FFF] focus:border-[#2B7FFF]"
        />
        <button
          onClick={handleAdd}
          disabled={loading || !newTag.trim()}
          className="p-1 bg-[#2B7FFF] text-white rounded-lg hover:bg-[#1A6FEF] disabled:opacity-50 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
