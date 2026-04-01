import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getLongLivedToken, calculateTokenExpiry } from '@/lib/meta/oauth'
import { decryptToken, encryptToken } from '@/lib/crypto/tokens'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // Buscar contas com token expirando nos próximos 10 dias
  const tenDaysFromNow = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()

  const { data: expiringAccounts, error } = await supabase
    .from('accounts')
    .select('id, access_token')
    .eq('is_active', true)
    .lte('token_expires_at', tenDaysFromNow)

  if (error) {
    console.error('[Cron/TokenRefresh] Falha ao buscar contas', error)
    return NextResponse.json({ error: 'Falha ao buscar contas' }, { status: 500 })
  }

  if (!expiringAccounts || expiringAccounts.length === 0) {
    return NextResponse.json({ refreshed: 0 })
  }

  let refreshed = 0
  let failed = 0

  for (const account of expiringAccounts) {
    try {
      const plainToken = decryptToken(account.access_token)
      const newToken = await getLongLivedToken(plainToken)

      if (!newToken) {
        console.error(`[Cron/TokenRefresh] Falha ao renovar token para conta ${account.id}`)
        failed++
        continue
      }

      const { error: updateError } = await supabase
        .from('accounts')
        .update({
          access_token: encryptToken(newToken.access_token),
          token_expires_at: calculateTokenExpiry(newToken.expires_in).toISOString(),
        })
        .eq('id', account.id)

      if (updateError) {
        console.error(`[Cron/TokenRefresh] Falha ao salvar token renovado para conta ${account.id}`, updateError)
        failed++
      } else {
        refreshed++
      }
    } catch (err) {
      console.error(`[Cron/TokenRefresh] Erro ao processar conta ${account.id}`, err)
      failed++
    }
  }

  console.log(`[Cron/TokenRefresh] ${refreshed} renovados, ${failed} falhos`)
  return NextResponse.json({ refreshed, failed })
}
