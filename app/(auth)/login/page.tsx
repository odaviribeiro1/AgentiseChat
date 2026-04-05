'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  async function handleLogin() {
    if (!email || !password) return
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error('[Login] Erro:', error)
      setError('E-mail ou senha incorretos. Tente novamente.')
      setLoading(false)
    } else {
      // O middleware/layout cuidará do redirecionamento se houver uma sessão ativa
      window.location.href = '/dashboard'
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center p-4">
      <div className="w-full max-w-md glass-card p-8 shadow-sm">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-lg bg-[#3B82F6] flex items-center justify-center flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 2L14 5.5V12.5L9 16L4 12.5V5.5L9 2Z" fill="white" opacity="0.9"/>
              <circle cx="9" cy="9" r="2.5" fill="white"/>
            </svg>
          </div>
          <span className="text-lg font-bold text-[#F8FAFC]">Agentise Chat</span>
        </div>

        <div className="mb-6">
          <h1 className="text-xl font-bold text-[#F8FAFC]">Entrar na plataforma</h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            Insira suas credenciais para acessar sua conta
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#CBD5E1] mb-1.5">
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full h-10 px-3 rounded-lg border border-[rgba(59,130,246,0.15)] bg-[rgba(15,18,35,0.6)] text-sm text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#CBD5E1] mb-1.5">
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="••••••••"
              className="w-full h-10 px-3 rounded-lg border border-[rgba(59,130,246,0.15)] bg-[rgba(15,18,35,0.6)] text-sm text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent transition-all"
            />
          </div>

          {error && (
            <p className="text-xs text-[#EF4444]">{error}</p>
          )}

          <button
            onClick={handleLogin}
            disabled={loading || !email || !password}
            className="w-full h-10 rounded-lg bg-[#3B82F6] text-white text-sm font-semibold hover:bg-[#2563EB] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </div>
      </div>
    </div>
  )
}
