'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { disconnectInstagram } from '@/app/actions/settings'

export function DisconnectInstagram() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDisconnect() {
    setLoading(true)
    try {
      await disconnectInstagram()
    } finally {
      setLoading(false)
      setOpen(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-[#E53E3E]/30 p-6">
      <h2 className="text-sm font-semibold text-[#1A202C] mb-2">Zona de Perigo</h2>
      <p className="text-sm text-[#718096] mb-4">
        Ao desconectar, todas as automações serão pausadas e o token de acesso será removido permanentemente.
        Você precisará reconectar sua conta para voltar a usar a plataforma.
      </p>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#FFF5F5] hover:bg-[#FED7D7] text-[#E53E3E] border border-[#E53E3E]/30 rounded-lg text-sm font-semibold transition-colors">
            <Trash2 className="w-4 h-4" />
            Desconectar Conta do Instagram
          </button>
        </DialogTrigger>

        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desconectar Instagram?</DialogTitle>
            <DialogDescription>
              Esta ação pausará todas as automações ativas e removerá o token de acesso.
              Você precisará reconectar sua conta para continuar usando a plataforma.
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-4 py-2 border border-[#E2E8F0] rounded-lg text-sm text-[#4A5568] hover:bg-[#F8F9FB] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={loading}
              className="px-4 py-2 bg-[#E53E3E] hover:bg-[#C53030] text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors"
            >
              {loading ? 'Desconectando...' : 'Sim, desconectar'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
