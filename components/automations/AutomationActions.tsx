'use client'

import { useState } from 'react'
import { MoreHorizontal, Pencil, Trash2, Power, PowerOff } from 'lucide-react'
import { toggleAutomationStatus, deleteAutomation, renameAutomation } from '@/app/actions/automations'
import { toast } from 'sonner'

interface AutomationActionsProps {
  id: string
  name: string
  status: string
}

export function AutomationActions({ id, name, status }: AutomationActionsProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const res = await toggleAutomationStatus(id, status)
    if (res?.success) {
      toast.success(`Automação ${res.newStatus === 'active' ? 'ativada' : 'pausada'}!`)
    } else {
      toast.error('Erro ao mudar status')
    }
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('Tem certeza que deseja excluir esta automação permanentemente?')) return
    
    setIsDeleting(true)
    const res = await deleteAutomation(id)
    if (res.success) {
      toast.success('Automação excluída com sucesso!')
    } else {
      toast.error('Erro ao excluir')
    }
    setIsDeleting(false)
  }

  const handleRename = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const newName = prompt('Digite o novo nome para esta automação:', name)
    if (!newName || newName === name) return

    const res = await renameAutomation(id, newName)
    if (res.success) {
      toast.success('Nome alterado com sucesso!')
    } else {
      toast.error('Erro ao renomear')
    }
  }

  return (
    <div className="absolute top-4 right-4 flex gap-1 items-center">
      {/* Botão Principal de Ativar/Desativar */}
      <button
        onClick={handleToggle}
        className={`p-1.5 rounded-lg transition-colors border shadow-sm ${
          status === 'active' 
            ? 'bg-[#DEF7EC] border-[#DEF7EC] text-[#03543F] hover:bg-[#C3EEDF]' 
            : 'bg-[#F2F4F7] border-[#E2E8F0] text-[#718096] hover:bg-[#E2E8F0]'
        }`}
        title={status === 'active' ? 'Pausar Automação' : 'Ativar Automação'}
      >
        {status === 'active' ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
      </button>

      {/* Menu Adicional (Três Pontos) */}
      <div className="relative group">
        <button
          className="p-1.5 rounded-lg border border-[#E2E8F0] text-[#718096] hover:bg-[#F2F4F7] transition-all bg-white shadow-sm"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>

        {/* Dropdown Simplificado (via CSS no hover ou JS) */}
        <div className="absolute right-0 top-full mt-1.5 w-32 bg-white rounded-lg border border-[#E2E8F0] shadow-xl py-1 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all z-50">
          <button
            onClick={handleRename}
            className="w-full text-left px-3 py-1.5 text-xs font-semibold text-[#4A5568] hover:bg-[#F8F9FB] flex items-center gap-2"
          >
            <Pencil className="w-3.5 h-3.5" />
            Renomear
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="w-full text-left px-3 py-1.5 text-xs font-semibold text-[#E53E3E] hover:bg-[#FFF5F5] flex items-center gap-2 border-t border-[#F8F9FB]"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Excluir
          </button>
        </div>
      </div>
    </div>
  )
}
