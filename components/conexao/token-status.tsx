'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { AccountRow } from '@/lib/supabase/types'

interface TokenStatusProps {
  account: AccountRow
}

type ValidityState = 'checking' | 'valid' | 'invalid'

export function TokenStatus({ account }: TokenStatusProps) {
  const [loading, setLoading] = useState(false)
  const [validity, setValidity] = useState<ValidityState>('checking')
  const [expiresAt, setExpiresAt] = useState<Date | null>(
    account.token_expires_at ? new Date(account.token_expires_at) : null
  )

  const daysRemaining = expiresAt
    ? Math.floor((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  // Check real token validity against Meta on mount
  useEffect(() => {
    fetch('/api/instagram/token/status')
      .then(r => r.json())
      .then(json => {
        setValidity(json.valid ? 'valid' : 'invalid')
        if (!json.valid) {
          console.warn('[TokenStatus] Token inválido segundo Meta:', json.error)
        }
      })
      .catch(() => setValidity('valid')) // network error — assume valid, don't block UI
  }, [])

  function getBadge() {
    if (validity === 'checking') return { label: 'Verificando...', color: 'text-[#64748B] bg-[#F7FAFC] border-[rgba(59,130,246,0.15)]' }
    if (validity === 'invalid') return { label: 'Token expirado', color: 'text-[#EF4444] bg-[rgba(239,68,68,0.12)] border-[#EF4444]' }
    if (daysRemaining === null) return { label: 'Sem data', color: 'text-[#64748B] bg-[#F7FAFC] border-[rgba(59,130,246,0.15)]' }
    if (daysRemaining > 30) return { label: 'Token válido', color: 'text-[#10B981] bg-[rgba(16,185,129,0.12)] border-[#10B981]' }
    if (daysRemaining >= 7) return { label: 'Renovação recomendada', color: 'text-[#F59E0B] bg-[rgba(245,158,11,0.12)] border-[#F59E0B]' }
    return { label: 'Token expirando!', color: 'text-[#EF4444] bg-[rgba(239,68,68,0.12)] border-[#EF4444]' }
  }

  async function handleRefresh() {
    // If already known invalid, go straight to OAuth reauth
    if (validity === 'invalid') {
      window.location.href = '/api/auth/meta'
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/instagram/token/refresh', { method: 'POST' })
      const json = await res.json()

      if (!res.ok) {
        if (json.requiresReauth) {
          toast.error('Token expirado. Reconectando sua conta...')
          setTimeout(() => { window.location.href = '/api/auth/meta' }, 1500)
          return
        }
        toast.error('Falha ao renovar token: ' + (json.error ?? 'Erro desconhecido'))
        return
      }

      setExpiresAt(new Date(json.expires_at))
      setValidity('valid')
      toast.success('Token renovado com sucesso! Válido por mais 60 dias.')
    } catch {
      toast.error('Erro de conexão ao renovar token.')
    } finally {
      setLoading(false)
    }
  }

  const badge = getBadge()
  const buttonLabel = validity === 'invalid'
    ? 'Reconectar conta'
    : loading ? 'Renovando...' : 'Renovar Token'

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-[#F8FAFC]">Token de acesso</h2>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-medium ${badge.color}`}>
          {badge.label}
        </span>
      </div>

      {validity === 'invalid' && (
        <div className="mb-4 p-3 bg-[rgba(239,68,68,0.12)] border border-[#FED7D7] rounded-lg">
          <p className="text-xs text-[#EF4444] leading-relaxed">
            Sua sessão com o Instagram expirou. Clique em <strong>Reconectar conta</strong> para autorizar o app novamente.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-[#64748B] uppercase tracking-wide font-medium mb-0.5">
            Expira em
          </p>
          <p className="text-sm font-medium text-[#CBD5E1]">
            {expiresAt
              ? expiresAt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
              : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-[#64748B] uppercase tracking-wide font-medium mb-0.5">
            Dias restantes
          </p>
          <p className={`text-sm font-medium ${
            validity === 'invalid' ? 'text-[#EF4444]'
            : daysRemaining === null ? 'text-[#64748B]'
            : daysRemaining > 30 ? 'text-[#10B981]'
            : daysRemaining >= 7 ? 'text-[#F59E0B]'
            : 'text-[#EF4444]'
          }`}>
            {validity === 'invalid' ? 'Expirado' : daysRemaining !== null ? `${daysRemaining} dias` : '—'}
          </p>
        </div>
      </div>

      <button
        onClick={handleRefresh}
        disabled={loading || validity === 'checking'}
        className={`w-full h-9 rounded-lg border text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          validity === 'invalid'
            ? 'border-[#EF4444] text-white bg-[#EF4444] hover:bg-[#C53030]'
            : 'border-[rgba(59,130,246,0.15)] text-[#CBD5E1] hover:bg-[#F7FAFC]'
        }`}
      >
        {buttonLabel}
      </button>
    </div>
  )
}
