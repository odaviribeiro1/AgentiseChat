import type { AccountRow } from '@/lib/supabase/types'

interface ConnectedAccountProps {
  account: AccountRow
}

export function ConnectedAccount({ account }: ConnectedAccountProps) {
  const connectedAt = new Date(account.created_at ?? '').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-6">
      <h2 className="text-sm font-semibold text-[#1A202C] mb-4">Conta conectada</h2>

      <div className="flex items-center gap-4">
        {account.instagram_pic_url ? (
          <img
            src={account.instagram_pic_url}
            alt={account.instagram_username}
            className="w-14 h-14 rounded-full object-cover ring-2 ring-[#E2E8F0]"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#FCB045] flex items-center justify-center text-white font-bold text-xl">
            {account.instagram_username[0]?.toUpperCase()}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-[#1A202C]">
            {account.instagram_name}
          </p>
          <p className="text-sm text-[#718096]">@{account.instagram_username}</p>
          <p className="text-xs text-[#A0AEC0] mt-1">
            ID: {account.instagram_user_id}
          </p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-[#F7FAFC] grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-[#A0AEC0] uppercase tracking-wide font-medium mb-0.5">
            Status
          </p>
          <span className="text-sm font-medium text-[#38A169]">● Ativa</span>
        </div>
        <div>
          <p className="text-xs text-[#A0AEC0] uppercase tracking-wide font-medium mb-0.5">
            Conectada em
          </p>
          <p className="text-sm text-[#2D3748]">{connectedAt}</p>
        </div>
      </div>
    </div>
  )
}
