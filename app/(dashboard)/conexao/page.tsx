import { createClient } from '@/lib/supabase/server'
import { ConnectionStatus } from '@/components/conexao/connection-status'
import { ConnectedAccount } from '@/components/conexao/connected-account'
import { PostsList } from '@/components/conexao/posts-list'
import { TokenStatus } from '@/components/conexao/token-status'

interface ConexaoPageProps {
  searchParams: Promise<{ success?: string; error?: string }>
}

export default async function ConexaoPage({ searchParams }: ConexaoPageProps) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: account } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', user!.id)
    .eq('is_active', true)
    .maybeSingle()

  return (
    <div className="max-w-3xl">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#F8FAFC]">Conexão Instagram</h1>
        <p className="text-sm text-[#94A3B8] mt-0.5">
          Conecte sua conta Instagram Business ou Creator para ativar as automações
        </p>
      </div>

      {/* Feedback OAuth */}
      {params.success && (
        <div className="mb-6 p-4 bg-[rgba(16,185,129,0.12)] border border-[#10B981] rounded-xl">
          <p className="text-sm font-medium text-[#10B981]">
            ✓ Conta Instagram conectada com sucesso!
          </p>
        </div>
      )}
      {params.error && (
        <div className="mb-6 p-4 bg-[rgba(239,68,68,0.12)] border border-[#EF4444] rounded-xl">
          <p className="text-sm font-medium text-[#EF4444]">
            Erro ao conectar: {getErrorMessage(params.error)}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        <ConnectionStatus account={account} />

        {account && (
          <>
            <ConnectedAccount account={account} />
            <TokenStatus account={account} />
            <PostsList accountId={account.instagram_user_id} />
          </>
        )}
      </div>
    </div>
  )
}

function getErrorMessage(error: string): string {
  const messages: Record<string, string> = {
    cancelled:             'Autorização cancelada pelo usuário',
    invalid_callback:      'Callback inválido',
    csrf_failed:           'Falha de segurança CSRF — tente novamente',
    token_exchange_failed: 'Falha ao obter token de acesso',
    long_token_failed:     'Falha ao obter token de longa duração',
    profile_failed:        'Falha ao buscar perfil do Instagram',
    db_failed:             'Falha ao salvar conta no banco de dados',
    access_denied:         'Acesso negado. Verifique se você é um testador aprovado do app.',
  }
  
  return messages[error] ?? `Erro de autorização: ${error}`
}
