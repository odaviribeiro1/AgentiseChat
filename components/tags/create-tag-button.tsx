'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { createTag } from '@/app/actions/tags'
import { toast } from 'sonner'

interface CreateTagButtonProps {
  accountId: string
}

export function CreateTagButton({ accountId }: CreateTagButtonProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    const trimmed = name.trim()
    if (!trimmed) return

    setLoading(true)
    const result = await createTag(accountId, trimmed)
    setLoading(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success(`Tag "${trimmed}" criada!`)
    setName('')
    setOpen(false)
  }

  if (open) {
    return (
      <div className="flex items-center gap-2">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          placeholder="Nome da tag"
          className="border border-[rgba(59,130,246,0.15)] rounded-lg px-3 py-2 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-[#3B82F6]"
          autoFocus
          disabled={loading}
        />
        <button
          onClick={handleCreate}
          disabled={loading || !name.trim()}
          className="bg-[#3B82F6] hover:bg-[#2563EB] text-white text-sm font-semibold px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          Criar
        </button>
        <button
          onClick={() => { setOpen(false); setName('') }}
          className="text-sm text-[#94A3B8] hover:underline"
        >
          Cancelar
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setOpen(true)}
      className="bg-[#3B82F6] hover:bg-[#2563EB] text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
    >
      <Plus className="w-4 h-4" />
      Criar Tag
    </button>
  )
}
