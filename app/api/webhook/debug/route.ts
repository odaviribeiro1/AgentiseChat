import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getUserPages, subscribeAppToPage, validateToken } from '@/lib/meta/instagram'
import { graphApi } from '@/lib/meta/client'
import { decryptToken } from '@/lib/crypto/tokens'

/**
 * GET /api/webhook/debug
 * Endpoint de diagnóstico para verificar e re-subscribir webhooks.
 * Retorna status de cada etapa do pipeline.
 */
export async function GET() {
  const results: Record<string, unknown> = {}

  try {
    // 1. Verificar variáveis de ambiente
    results.env = {
      META_APP_SECRET: !!process.env.META_APP_SECRET,
      META_VERIFY_TOKEN: !!process.env.META_VERIFY_TOKEN,
      SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    }

    // 2. Buscar conta ativa no banco
    const supabase = createServiceClient()
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('*')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()

    if (accountError) {
      results.account = { error: accountError.message }
      return NextResponse.json(results)
    }

    if (!account) {
      results.account = { error: 'Nenhuma conta ativa encontrada' }
      return NextResponse.json(results)
    }

    results.account = {
      id: account.id,
      instagram_user_id: account.instagram_user_id,
      username: account.instagram_username,
      token_expires_at: account.token_expires_at,
      webhook_verified_at: account.webhook_verified_at,
      is_active: account.is_active,
    }

    // 3. Verificar se o token é válido
    const plainToken = decryptToken(account.access_token)
    const tokenValid = await validateToken(plainToken)
    results.token_valid = tokenValid

    if (!tokenValid) {
      results.token_error = 'Token inválido ou expirado — reconecte a conta em /conexao'
      return NextResponse.json(results)
    }

    // 4. Buscar páginas do Facebook e tentar re-subscribir
    const pages = await getUserPages(plainToken)
    results.pages_found = pages.length
    results.pages = pages.map(p => ({
      id: p.id,
      name: p.name,
      has_ig: !!p.instagram_business_account,
      ig_id: p.instagram_business_account?.id,
    }))

    // 5. Tentar encontrar a página vinculada ao Instagram
    //    Primeiro tenta match direto, senão faz query individual por página
    let linkedPage = pages.find(
      p => p.instagram_business_account?.id === account.instagram_user_id
    )

    if (!linkedPage) {
      // A API me/accounts nem sempre retorna instagram_business_account inline.
      // Fazer query individual para cada página (como getInstagramProfile faz).
      results.ig_link_fallback = 'Tentando query individual por página...'
      for (const page of pages) {
        const { data: pageData } = await graphApi<{ instagram_business_account?: { id: string } }>(
          `${page.id}?fields=instagram_business_account`,
          { accessToken: plainToken }
        )
        if (pageData?.instagram_business_account?.id === account.instagram_user_id) {
          linkedPage = page
          results.ig_link_fallback = `Encontrado via query individual: page ${page.id}`
          break
        }
        // Logar o que retornou para debug
        results[`page_${page.id}_ig_check`] = pageData
      }
    }

    if (!linkedPage && pages.length === 1) {
      // Se só tem 1 página, tentar subscribir de qualquer forma
      results.ig_link_fallback = 'Única página disponível — tentando subscribir mesmo sem link IG visível'
      linkedPage = pages[0]
    }

    if (!linkedPage) {
      results.subscription = { error: 'Nenhuma página vinculada ao Instagram encontrada' }
      return NextResponse.json(results)
    }

    const subResult = await subscribeAppToPage(linkedPage.id, linkedPage.access_token)
    results.subscription = {
      page_id: linkedPage.id,
      page_name: linkedPage.name,
      subscribed: subResult.success,
      error: subResult.error,
    }

    if (subResult.success) {
      await supabase
        .from('accounts')
        .update({ webhook_verified_at: new Date().toISOString() })
        .eq('id', account.id)
    }

    // 6. Verificar automações ativas
    const { data: automations } = await supabase
      .from('automations')
      .select('id, name, status, trigger_type, trigger_config')
      .eq('account_id', account.id)
      .eq('status', 'active')

    results.active_automations = automations?.map(a => ({
      id: a.id,
      name: a.name,
      trigger_type: a.trigger_type,
      trigger_config: a.trigger_config,
    })) ?? []

    // 7. Contar webhook_events recentes
    const { count } = await supabase
      .from('webhook_events')
      .select('*', { count: 'exact', head: true })

    results.total_webhook_events = count

    results.status = subResult.success ? 'OK — webhook re-subscribed' : 'FALHA na re-subscription'

  } catch (err) {
    results.fatal_error = err instanceof Error ? err.message : String(err)
  }

  return NextResponse.json(results, { status: 200 })
}
