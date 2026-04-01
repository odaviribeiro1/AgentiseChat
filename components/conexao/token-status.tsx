'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import type { AccountRow } from '@/lib/supabase/types'

interface TokenStatusProps {
  account: AccountRow
}

export function TokenStatus({ account }: TokenStatusProps) {
  const [loading, setLoading] = useState(false)
  const [expiresAt, setExpiresAt] = useState<Date | null>(
    account.token_expires_at ? new Date(account.token_expires_at) : null
  )

  const daysRemaining = expiresAt
    ? Math.floor((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  function getBadge() {
    if (daysRemaining === null) return { label: 'Sem data', color: 'text-[#A0AEC0] bg-[#F7FAFC] border-[#E2E8F0]' }
    if (daysRemaining > 30) return { label: 'Token válido', color: 'text-[#38A169] bg-[#F0FFF4] border-[#38A169]' }
    if (daysRemaining >= 7) return { label: 'Renovação recomendada', color: 'text-[#D97706] bg-[#FFFBEB] border-[#D97706]' }
    return { label: 'Token expirando!', color: 'text-[#E53E3E] bg-[#FFF5F5] border-[#E53E3E]' }
  }

  async function handleRefresh() {
    setLoading(true)
    try {
      const res = await fetch('/api/instagram/token/refresh', { method: 'POST' })
      const json = await res.json()

      if (!res.ok) {
        toast.error('Falha ao renovar token: ' + (json.error ?? 'Erro desconhecido'))
        return
      }

      setExpiresAt(new Date(json.expires_at))
      toast.success('Token renovado com sucesso! Válido por mais 60 dias.')
    } catch {
      toast.error('Erro de conexão ao renovar token.')
    } finally {
      setLoading(false)
    }
  }

  const badge = getBadge()

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-[#1A202C]">Token de acesso</h2>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-medium ${badge.color}`}>
          {badge.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-[#A0AEC0] uppercase tracking-wide font-medium mb-0.5">
            Expira em
          </p>
          <p className="text-sm font-medium text-[#2D3748]">
            {expiresAt
              ? expiresAt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
              : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-[#A0AEC0] uppercase tracking-wide font-medium mb-0.5">
            Dias restantes
          </p>
          <p className={`text-sm font-medium ${
            daysRemaining === null ? 'text-[#A0AEC0]'
            : daysRemaining > 30 ? 'text-[#38A169]'
            : daysRemaining >= 7 ? 'text-[#D97706]'
            : 'text-[#E53E3E]'
          }`}>
            {daysRemaining !== null ? `${daysRemaining} dias` : '—'}
          </p>
        </div>
      </div>

      <button
        onClick={handleRefresh}
        disabled={loading}
        className="w-full h-9 rounded-lg border border-[#E2E8F0] text-sm font-medium text-[#2D3748] hover:bg-[#F7FAFC] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Renovando...' : 'Renovar Token'}
      </button>
    </div>
  )
}
