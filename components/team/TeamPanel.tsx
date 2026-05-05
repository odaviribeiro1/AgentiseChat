'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Users, Mail } from 'lucide-react'
import { toast } from 'sonner'

interface Member {
  id: string
  email: string
  role: string
  created_at: string
}

interface Invite {
  id: string
  email: string
  role: string
  expires_at: string
  used_at: string | null
  revoked_at: string | null
  created_at: string
}

export function TeamPanel({ members, invites }: { members: Member[]; invites: Invite[] }) {
  const [email, setEmail] = useState('')
  const [creating, setCreating] = useState(false)
  const [, startTransition] = useTransition()
  const router = useRouter()

  const pendingInvites = invites.filter(i => !i.used_at && !i.revoked_at && new Date(i.expires_at) > new Date())

  async function handleCreate() {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) return
    setCreating(true)
    try {
      const res = await fetch('/api/team/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? 'Erro ao criar convite')
        return
      }
      await navigator.clipboard.writeText(json.invite_url).catch(() => {})
      toast.success('Convite criado — link copiado para a área de transferência.')
      setEmail('')
      startTransition(() => router.refresh())
    } finally {
      setCreating(false)
    }
  }

  async function handleRevoke(id: string) {
    const res = await fetch(`/api/team/invites/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      toast.error(j.error ?? 'Erro ao revogar')
      return
    }
    toast.success('Convite revogado.')
    startTransition(() => router.refresh())
  }

  return (
    <div className="space-y-6">
      {/* Convidar */}
      <section className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-[#94A3B8]" />
          <h2 className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wide">Convidar novo membro</h2>
        </div>
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="email@exemplo.com"
            className="flex-1 h-10 px-3 rounded-lg border border-[rgba(59,130,246,0.15)] bg-[rgba(15,18,35,0.6)] text-sm text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
          />
          <button
            onClick={handleCreate}
            disabled={creating || !email}
            className="h-10 px-4 rounded-lg bg-[#3B82F6] text-white text-sm font-semibold hover:bg-[#2563EB] disabled:opacity-50 transition-colors"
          >
            {creating ? 'Criando…' : 'Convidar'}
          </button>
        </div>
        <p className="text-xs text-[#64748B]">
          O convidado entra como <strong>member</strong>. Link válido por 7 dias.
        </p>
      </section>

      {/* Convites pendentes */}
      <section className="glass-card p-6 space-y-3">
        <h2 className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wide">Convites pendentes</h2>
        {pendingInvites.length === 0 ? (
          <p className="text-sm text-[#64748B]">Nenhum convite pendente.</p>
        ) : (
          <ul className="divide-y divide-[rgba(59,130,246,0.08)]">
            {pendingInvites.map(inv => (
              <li key={inv.id} className="py-3 flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm text-[#F8FAFC]">{inv.email}</p>
                  <p className="text-xs text-[#64748B]">expira em {new Date(inv.expires_at).toLocaleDateString('pt-BR')}</p>
                </div>
                <button
                  onClick={() => handleRevoke(inv.id)}
                  className="p-2 rounded text-[#94A3B8] hover:text-red-400 hover:bg-[rgba(239,68,68,0.08)]"
                  title="Revogar convite"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Membros */}
      <section className="glass-card p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-[#94A3B8]" />
          <h2 className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wide">Membros ({members.length})</h2>
        </div>
        <ul className="divide-y divide-[rgba(59,130,246,0.08)]">
          {members.map(m => (
            <li key={m.id} className="py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#3B82F6] text-white text-xs font-bold flex items-center justify-center">
                {m.email[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="flex-1">
                <p className="text-sm text-[#F8FAFC]">{m.email}</p>
                <p className="text-xs text-[#64748B]">desde {new Date(m.created_at).toLocaleDateString('pt-BR')}</p>
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                m.role === 'owner' || m.role === 'admin'
                  ? 'bg-[rgba(34,197,94,0.12)] text-[#22C55E]'
                  : 'bg-[rgba(59,130,246,0.12)] text-[#3B82F6]'
              }`}>
                {m.role}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
