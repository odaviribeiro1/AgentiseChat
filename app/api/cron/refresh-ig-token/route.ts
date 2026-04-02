import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { refreshIgToken, calculateTokenExpiry } from '@/lib/meta/oauth'
import { decryptToken, encryptToken } from '@/lib/crypto/tokens'

/**
 * GET /api/cron/refresh-ig-token
 *
 * Renova Instagram Tokens (IGAA) que expiram nos próximos 10 dias.
 * Deve rodar diariamente via cron externo (Upstash, Vercel Cron, etc.).
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // Buscar contas com ig_token expirando nos próximos 10 dias
  const tenDaysFromNow = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()

  const { data: accounts, error } = await supabase
    .from('accounts')
    .select('id, ig_access_token, ig_token_expires_at')
    .eq('is_active', true)
    .not('ig_access_token', 'is', null)
    .lte('ig_token_expires_at', tenDaysFromNow)

  if (error) {
    console.error('[Cron/RefreshIgToken] Falha ao buscar contas', error)
    return NextResponse.json({ error: 'Falha ao buscar contas' }, { status: 500 })
  }

  if (!accounts?.length) {
    return NextResponse.json({ refreshed: 0, message: 'Nenhum token a renovar' })
  }

  let refreshed = 0
  let failed = 0

  for (const account of accounts) {
    try {
      const plainIgToken = decryptToken(account.ig_access_token!)
      const result = await refreshIgToken(plainIgToken)

      if (result.error) {
        console.error(`[Cron/RefreshIgToken] Falha para conta ${account.id}`, result.error)
        failed++
        continue
      }

      const { error: updateError } = await supabase
        .from('accounts')
        .update({
          ig_access_token: encryptToken(result.data!.access_token),
          ig_token_expires_at: calculateTokenExpiry(result.data!.expires_in).toISOString(),
        })
        .eq('id', account.id)

      if (updateError) {
        console.error(`[Cron/RefreshIgToken] Falha ao salvar token para ${account.id}`, updateError)
        failed++
      } else {
        refreshed++
        console.log(`[Cron/RefreshIgToken] Token renovado para conta ${account.id}`)
      }
    } catch (err) {
      console.error(`[Cron/RefreshIgToken] Erro ao processar conta ${account.id}`, err)
      failed++
    }
  }

  return NextResponse.json({ refreshed, failed })
}
