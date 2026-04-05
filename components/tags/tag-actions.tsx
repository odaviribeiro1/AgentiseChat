'use client'

import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { renameTag, deleteTag } from '@/app/actions/tags'

interface TagActionsProps {
  tag: string
  accountId: string
}

export function TagActions({ tag, accountId }: TagActionsProps) {
  const [renaming, setRenaming] = useState(false)
  const [newName, setNewName] = useState(tag)
  const [loading, setLoading] = useState(false)

  const handleRename = async () => {
    const trimmed = newName.trim().toLowerCase()
    if (!trimmed || trimmed === tag) {
      setRenaming(false)
      return
    }
    setLoading(true)
    await renameTag(accountId, tag, trimmed)
    setRenaming(false)
    setLoading(false)
  }

  const handleDelete = async () => {
    if (!confirm(`Remover a tag "${tag}" de todos os contatos?`)) return
    setLoading(true)
    await deleteTag(accountId, tag)
    setLoading(false)
  }

  if (renaming) {
    return (
      <div className="flex items-center gap-2">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleRename()}
          className="border border-[rgba(59,130,246,0.15)] rounded-lg px-2 py-1 text-sm w-32 focus:ring-[#3B82F6] focus:border-[#3B82F6]"
          autoFocus
          disabled={loading}
        />
        <button
          onClick={handleRename}
          disabled={loading}
          className="text-xs font-semibold text-[#3B82F6] hover:underline disabled:opacity-50"
        >
          Salvar
        </button>
        <button
          onClick={() => { setRenaming(false); setNewName(tag) }}
          className="text-xs text-[#94A3B8] hover:underline"
        >
          Cancelar
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => setRenaming(true)}
        disabled={loading}
        className="p-2 text-[#94A3B8] hover:text-[#3B82F6] hover:bg-[rgba(59,130,246,0.12)] rounded-lg transition-colors disabled:opacity-50"
        title="Renomear"
      >
        <Pencil className="w-4 h-4" />
      </button>
      <button
        onClick={handleDelete}
        disabled={loading}
        className="p-2 text-[#94A3B8] hover:text-[#EF4444] hover:bg-[rgba(239,68,68,0.12)] rounded-lg transition-colors disabled:opacity-50"
        title="Excluir de todos os contatos"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}
