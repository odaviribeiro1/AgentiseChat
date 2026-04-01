import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { Settings, Link2, Link } from 'lucide-react'
import { ConnectedAccount } from '@/components/conexao/connected-account'
import { TokenStatus } from '@/components/conexao/token-status'
import { DisconnectInstagram } from '@/components/settings/DisconnectInstagram'
import NextLink from 'next/link'

export default async function ConfiguracoesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const serviceClient = createServiceClient()
  const account = user
    ? await serviceClient
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle()
        .then((r) => r.data)
    : null

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#EBF3FF] text-[#2B7FFF] flex items-center justify-center">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#1A202C]">Configurações</h1>
          <p className="text-sm text-[#718096] mt-0.5">Gerencie os detalhes da conta do Agentise.</p>
        </div>
      </div>

      {/* Seção 1: Conta Instagram */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-[#718096]" />
          <h2 className="text-sm font-semibold text-[#718096] uppercase tracking-wide">Conta Instagram</h2>
        </div>

        {account ? (
          <ConnectedAccount account={account} />
        ) : (
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-[#718096]">Nenhuma conta Instagram conectada.</p>
            <NextLink
              href="/conexao"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#2B7FFF] hover:bg-[#1A6FEF] text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <Link className="w-4 h-4" />
              Conectar conta
            </NextLink>
          </div>
        )}
      </section>

      {/* Seção 2: Token de Acesso */}
      {account && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-[#718096]" />
            <h2 className="text-sm font-semibold text-[#718096] uppercase tracking-wide">Token de Acesso</h2>
          </div>
          <TokenStatus account={account} />
        </section>
      )}

      {/* Seção 3: Zona de Perigo */}
      {account && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-[#E53E3E] uppercase tracking-wide">Zona de Perigo</h2>
          <DisconnectInstagram />
        </section>
      )}
    </div>
  )
}
