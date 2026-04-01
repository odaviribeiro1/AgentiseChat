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
    <div className="min-h-screen bg-[#F0F2F5] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl border border-[#E2E8F0] p-8 shadow-sm">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-lg bg-[#2B7FFF] flex items-center justify-center flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 2L14 5.5V12.5L9 16L4 12.5V5.5L9 2Z" fill="white" opacity="0.9"/>
              <circle cx="9" cy="9" r="2.5" fill="white"/>
            </svg>
          </div>
          <span className="text-lg font-bold text-[#1A202C]">Agentise Chat</span>
        </div>

        <div className="mb-6">
          <h1 className="text-xl font-bold text-[#1A202C]">Entrar na plataforma</h1>
          <p className="text-sm text-[#718096] mt-1">
            Insira suas credenciais para acessar sua conta
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#2D3748] mb-1.5">
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#1A202C] placeholder:text-[#A0AEC0] focus:outline-none focus:ring-2 focus:ring-[#2B7FFF] focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#2D3748] mb-1.5">
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="••••••••"
              className="w-full h-10 px-3 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#1A202C] placeholder:text-[#A0AEC0] focus:outline-none focus:ring-2 focus:ring-[#2B7FFF] focus:border-transparent transition-all"
            />
          </div>

          {error && (
            <p className="text-xs text-[#E53E3E]">{error}</p>
          )}

          <button
            onClick={handleLogin}
            disabled={loading || !email || !password}
            className="w-full h-10 rounded-lg bg-[#2B7FFF] text-white text-sm font-semibold hover:bg-[#1A6FEF] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </div>
      </div>
    </div>
  )
}
