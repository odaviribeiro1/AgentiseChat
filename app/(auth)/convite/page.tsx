'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type LookupState =
  | { status: 'loading' }
  | { status: 'invalid'; reason: string }
  | { status: 'ready'; email: string; expiresAt: string }

export default function InvitePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0A0A0F]" />}>
      <InviteForm />
    </Suspense>
  )
}

function InviteForm() {
  const params = useSearchParams()
  const token = params.get('token') ?? ''
  const supabase = createClient()

  const [lookup, setLookup] = useState<LookupState>({ status: 'loading' })
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!token) {
      setLookup({ status: 'invalid', reason: 'Token ausente na URL.' })
      return
    }
    // RPC criada na migration 0016; database.types.ts ainda não foi regenerado.
    ;(supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<{ data: Array<{ email: string; expires_at: string }> | { email: string; expires_at: string } | null; error: unknown }>)
      ('invite_lookup', { p_token: token })
      .then(({ data, error: e }) => {
        if (e) {
          setLookup({ status: 'invalid', reason: 'Erro ao consultar convite.' })
          return
        }
        const row = Array.isArray(data) ? data[0] : data
        if (!row) {
          setLookup({ status: 'invalid', reason: 'Convite inválido, expirado ou já utilizado.' })
          return
        }
        setLookup({ status: 'ready', email: row.email, expiresAt: row.expires_at })
      })
  }, [token, supabase])

  async function handleSubmit() {
    if (lookup.status !== 'ready') return
    if (password.length < 8) {
      setError('Senha precisa ter no mínimo 8 caracteres.')
      return
    }
    setSubmitting(true)
    setError(null)
    const { error: signupError } = await supabase.auth.signUp({
      email: lookup.email,
      password,
      options: { data: { invite_token: token } },
    })
    setSubmitting(false)
    if (signupError) {
      setError(signupError.message)
      return
    }
    setDone(true)
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center p-4">
      <div className="w-full max-w-md glass-card p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-lg bg-[#3B82F6] flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 2L14 5.5V12.5L9 16L4 12.5V5.5L9 2Z" fill="white" opacity="0.9"/>
              <circle cx="9" cy="9" r="2.5" fill="white"/>
            </svg>
          </div>
          <span className="text-lg font-bold text-[#F8FAFC]">Agentise Chat</span>
        </div>

        {lookup.status === 'loading' && (
          <p className="text-sm text-[#94A3B8]">Validando convite…</p>
        )}

        {lookup.status === 'invalid' && (
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-[#F8FAFC]">Convite inválido</h1>
            <p className="text-sm text-[#94A3B8]">{lookup.reason}</p>
            <p className="text-sm text-[#94A3B8]">Solicite um novo convite ao owner desta instância.</p>
          </div>
        )}

        {lookup.status === 'ready' && !done && (
          <>
            <div className="mb-6">
              <h1 className="text-xl font-bold text-[#F8FAFC]">Aceitar convite</h1>
              <p className="text-sm text-[#94A3B8] mt-1">Defina sua senha para criar a conta.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#CBD5E1] mb-1.5">E-mail</label>
                <input
                  type="email"
                  value={lookup.email}
                  disabled
                  className="w-full h-10 px-3 rounded-lg border border-[rgba(59,130,246,0.15)] bg-[rgba(15,18,35,0.4)] text-sm text-[#94A3B8]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#CBD5E1] mb-1.5">Senha</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  placeholder="mínimo 8 caracteres"
                  className="w-full h-10 px-3 rounded-lg border border-[rgba(59,130,246,0.15)] bg-[rgba(15,18,35,0.6)] text-sm text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                />
              </div>

              {error && <p className="text-xs text-[#EF4444]">{error}</p>}

              <button
                onClick={handleSubmit}
                disabled={submitting || password.length < 8}
                className="w-full h-10 rounded-lg bg-[#3B82F6] text-white text-sm font-semibold hover:bg-[#2563EB] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Criando conta…' : 'Criar conta'}
              </button>
            </div>
          </>
        )}

        {done && (
          <div className="space-y-3">
            <h1 className="text-xl font-bold text-[#F8FAFC]">Conta criada!</h1>
            <p className="text-sm text-[#94A3B8]">
              Verifique seu email para confirmar o cadastro. Depois entre normalmente em{' '}
              <a href="/login" className="text-[#3B82F6] hover:underline">/login</a>.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
