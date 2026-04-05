import Link from 'next/link'
import type { AccountRow } from '@/lib/supabase/types'

interface ConnectionStatusProps {
  account: AccountRow | null
}

export function ConnectionStatus({ account }: ConnectionStatusProps) {
  if (account) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              {account.instagram_pic_url ? (
                <img
                  src={account.instagram_pic_url}
                  alt={account.instagram_username}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#FCB045] flex items-center justify-center text-white font-bold text-lg">
                  {account.instagram_username[0]?.toUpperCase()}
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#10B981] border-2 border-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#F8FAFC]">
                @{account.instagram_username}
              </p>
              <p className="text-xs text-[#94A3B8]">{account.instagram_name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[rgba(16,185,129,0.12)] border border-[#10B981] text-xs font-medium text-[#10B981]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
              Conectada
            </span>
            <Link
              href="/api/auth/meta"
              className="px-3 py-1.5 rounded-lg border border-[rgba(59,130,246,0.15)] text-xs font-medium text-[#94A3B8] hover:bg-[#F7FAFC] transition-colors"
            >
              Reconectar
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card p-8">
      <div className="flex flex-col items-center text-center max-w-sm mx-auto">
        {/* Ícone Instagram */}
        <div className="w-16 h-16 rounded-2xl bg-[#F7FAFC] border border-[rgba(59,130,246,0.15)] flex items-center justify-center mb-4">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-[rgba(59,130,246,0.2)]">
            <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="1.5"/>
            <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5"/>
            <circle cx="17.5" cy="6.5" r="1" fill="currentColor"/>
          </svg>
        </div>

        <h2 className="text-base font-semibold text-[#F8FAFC] mb-1">
          Nenhuma conta conectada
        </h2>
        <p className="text-sm text-[#94A3B8] mb-6">
          Conecte sua conta Instagram Business ou Creator para ativar as automações
        </p>

        {/* Requisitos */}
        <ul className="text-left w-full space-y-2 mb-6">
          {[
            'Conta Instagram Business ou Creator',
            'App Meta aprovado com permissões corretas',
            'Conta conectada a uma Página do Facebook',
          ].map(req => (
            <li key={req} className="flex items-start gap-2 text-xs text-[#94A3B8]">
              <svg className="w-4 h-4 text-[#64748B] mt-0.5 flex-shrink-0" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M5.5 8L7 9.5L10.5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {req}
            </li>
          ))}
        </ul>

        <Link
          href="/api/auth/meta"
          className="w-full h-10 flex items-center justify-center rounded-lg bg-[#3B82F6] text-white text-sm font-semibold hover:bg-[#2563EB] transition-colors"
        >
          Conectar com Instagram
        </Link>
      </div>
    </div>
  )
}
