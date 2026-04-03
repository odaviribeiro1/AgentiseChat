import { createServiceClient } from '@/lib/supabase/server'
import { canSendToContact } from './anti-spam'
import { executeAutomationRun } from './executor'
import type { NormalizedWebhookEvent } from '@/lib/meta/types'
import type { AutomationRow, AccountRow, ContactRow, TriggerConfig } from '@/lib/supabase/types'
import type { WebhookEventType } from '@/lib/meta/types'
import type { Json } from '@/lib/supabase/database.types'

/**
 * Ponto de entrada do motor de automações.
 * Chamado pelo webhook receiver para cada evento normalizado.
 * Atualmente processa apenas eventos de comentário (comment_keyword).
 * Eventos dm_text/dm_quick_reply serão suportados no Módulo 5.
 */
export async function processAutomationEvent(
  event: NormalizedWebhookEvent
): Promise<void> {
  const supabase = createServiceClient()

  // Helper para logar debug no banco (visível no Supabase Dashboard)
  const debugLog = async (stage: string, details: Record<string, unknown>) => {
    // Debug persisted to webhook_events — no console.log in production
    try {
      await supabase.from('webhook_events').insert({
        event_type: `engine_debug:${stage}`,
        instagram_user_id: event.senderIgId,
        payload: { stage, ...details, eventType: event.type, accountIgId: event.accountIgId } as any,
      })
    } catch { /* não falhar por causa do log */ }
  }

  // Ignorar eventos irrelevantes
  if (!['comment', 'dm_text', 'dm_quick_reply'].includes(event.type)) {
    await debugLog('ignored_event_type', { type: event.type })
    return
  }

  await debugLog('start', {
    type: event.type,
    accountIgId: event.accountIgId,
    senderIgId: event.senderIgId,
    commentText: event.comment?.text,
    commentId: event.comment?.id,
  })

  // 1. Encontrar a conta pelo instagram_user_id
  const { data: account, error: accountError } = await supabase
    .from('accounts')
    .select('*')
    .eq('instagram_user_id', event.accountIgId)
    .eq('is_active', true)
    .maybeSingle()

  if (!account) {
    await debugLog('account_not_found', {
      accountIgId: event.accountIgId,
      dbError: accountError?.message,
    })
    return
  }

  await debugLog('account_found', { accountId: account.id, username: account.instagram_username })

  // 2. Upsert do contato que fez a interação
  const contact = await upsertContact(account, event.senderIgId, event.type)
  if (!contact) {
    await debugLog('contact_upsert_failed', { senderIgId: event.senderIgId })
    return
  }

  // Módulo 5: Tentar retomar fluxo existente se for mensagem (não comentário)
  if (event.type === 'dm_text' || event.type === 'dm_quick_reply') {
    const { resumeAutomationRun } = await import('./executor')
    const payloadOrText = event.message?.quickReplyPayload || event.message?.text || ''
    const isQuickReplyClick = !!event.message?.quickReplyPayload

    const resumed = await resumeAutomationRun(contact.id, payloadOrText, isQuickReplyClick)
    if (resumed) {
      await debugLog('flow_resumed', { contactId: contact.id })
      return
    }
    await debugLog('no_flow_to_resume', { contactId: contact.id })
  }

  // Se chegou aqui e é apenas um comentário, processa trigger de comentário
  if (event.type === 'comment' && event.comment) {
    // 3. Buscar automações ativas com trigger comment_keyword
    const { data: automations, error: autoError } = await supabase
      .from('automations')
      .select('*')
      .eq('account_id', account.id)
      .eq('status', 'active')
      .eq('trigger_type', 'comment_keyword')

    if (!automations?.length) {
      await debugLog('no_active_automations', {
        accountId: account.id,
        dbError: autoError?.message,
      })
      return
    }

    await debugLog('automations_found', {
      count: automations.length,
      names: automations.map(a => a.name),
    })

    // 4. Avaliar cada automação
    for (const automation of automations) {
      await evaluateAndRun(automation, account, contact, event)
    }
  }
}

/**
 * Avalia se um evento de comentário corresponde ao trigger de uma automação
 * e inicia o run se todas as condições forem satisfeitas.
 */
async function evaluateAndRun(
  automation: AutomationRow,
  account: AccountRow,
  contact: ContactRow,
  event: NormalizedWebhookEvent
): Promise<void> {
  const supabase = createServiceClient()
  const config = automation.trigger_config as unknown as TriggerConfig

  // Helper de debug persistente
  const debugLog = async (stage: string, details: Record<string, unknown>) => {
    // Debug persisted to webhook_events
    try {
      await supabase.from('webhook_events').insert({
        event_type: `engine_eval:${stage}`,
        instagram_user_id: event.senderIgId,
        payload: { stage, automationId: automation.id, automationName: automation.name, ...details } as any,
      })
    } catch { /* não falhar por causa do log */ }
  }

  // Verificar keyword
  const keywordMatch = matchesKeyword(event.comment!.text, config)
  if (!keywordMatch) {
    await debugLog('keyword_no_match', {
      commentText: event.comment!.text,
      keywords: config.keywords,
      matchType: config.match_type,
    })
    return
  }

  await debugLog('keyword_matched', { commentText: event.comment!.text })

  // Verificar post específico (se configurado)
  if (config.apply_to === 'specific_post' && config.post_id) {
    if (event.comment!.postId !== config.post_id) {
      await debugLog('post_mismatch', {
        expected: config.post_id,
        received: event.comment!.postId,
      })
      return
    }
  }

  // Verificar anti-spam
  const spamCheck = await canSendToContact({
    contactId: contact.id,
    automationId: automation.id,
    maxTriggerHours: config.max_triggers_per_user_hours ?? 24,
  })

  if (!spamCheck.allowed) {
    await debugLog('anti_spam_blocked', {
      reason: spamCheck.reason,
      contactId: contact.id,
    })
    return
  }

  // Buscar todos os steps da automação
  const { data: steps, error: stepsError } = await supabase
    .from('steps')
    .select('*')
    .eq('automation_id', automation.id)
    .order('position', { ascending: true })

  if (!steps?.length) {
    await debugLog('no_steps', { automationId: automation.id, dbError: stepsError?.message })
    return
  }

  // Encontrar o primeiro step (sem parent_step_id)
  const firstStep = steps.find(s => !s.parent_step_id)
  if (!firstStep) {
    await debugLog('no_first_step', { automationId: automation.id, stepsCount: steps.length })
    return
  }

  await debugLog('creating_run', {
    firstStepId: firstStep.id,
    firstStepType: firstStep.type,
    totalSteps: steps.length,
  })

  // Criar o automation_run
  const { data: run, error: runError } = await supabase
    .from('automation_runs')
    .insert({
      automation_id: automation.id,
      contact_id: contact.id,
      current_step_id: firstStep.id,
      status: 'running',
      trigger_event_id: event.comment!.id,
      trigger_payload: event.raw as unknown as Json,
    })
    .select()
    .single()

  if (runError || !run) {
    await debugLog('run_insert_failed', { error: runError?.message, code: runError?.code })
    return
  }

  await debugLog('run_created', { runId: run.id })

  // Incrementar contador de runs na automação
  await supabase
    .from('automations')
    .update({ total_runs: (automation.total_runs ?? 0) + 1 })
    .eq('id', automation.id)

  // Responder ao comentário publicamente (se configurado)
  if (config.reply_comment && config.reply_comment_text && event.comment!.id) {
    const { replyToComment } = await import('@/lib/meta/messages')
    await replyToComment(event.comment!.id, config.reply_comment_text)
  }

  // Run creation tracked via webhook_events engine_eval:run_created

  // Executar o fluxo (await — necessário para Vercel serverless)
  const { decryptToken } = await import('@/lib/crypto/tokens')
  const accountWithPlainToken = {
    ...account,
    access_token: decryptToken(account.access_token),
  }

  // Decriptar o Instagram Token (IGAA) para messaging via graph.instagram.com
  const igAccessToken = account.ig_access_token
    ? decryptToken(account.ig_access_token)
    : process.env.INSTAGRAM_DM_TOKEN // fallback para env var

  try {
    await executeAutomationRun(run.id, firstStep.id, {
      account: accountWithPlainToken,
      contact,
      allSteps: steps,
      triggerPostTitle: event.comment!.postId,
      triggerCommentId: run.trigger_event_id ?? undefined,
      igAccessToken,
    })
  } catch (err) {
    console.error('[Engine] Erro fatal no executor', { runId: run.id, err })
    await debugLog('executor_error', {
      runId: run.id,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

/**
 * Avalia se o texto do comentário corresponde às keywords do trigger.
 * Se o match_type for 'any', retorna true para qualquer conteúdo.
 */
export function matchesKeyword(comment: string, config: TriggerConfig): boolean {
  if (config.match_type === 'any') return true
  if (!config.keywords?.length) return false

  const text = (comment || '').toLowerCase().trim()
  return config.keywords.some(kw => {
    const keyword = kw.toLowerCase().trim()
    return config.match_type === 'exact'
      ? text === keyword
      : text.includes(keyword)
  })
}

/**
 * Upsert do contato que gerou o evento.
 * Atualiza window_expires_at apenas para eventos de DM (não para comentários).
 * Um comentário NÃO abre a janela de 24h de mensagens.
 */
async function upsertContact(
  account: AccountRow,
  senderIgId: string,
  eventType: WebhookEventType
): Promise<ContactRow | null> {
  const supabase = createServiceClient()
  const isDmEvent = ['dm_text', 'dm_quick_reply', 'dm_image', 'dm_story_reply'].includes(eventType)

  // Só atualizar janela de 24h para eventos de DM (não comentários)
  const now = new Date()
  const upsertData = {
    account_id: account.id,
    instagram_user_id: senderIgId,
    ...(isDmEvent ? {
      last_message_at: now.toISOString(),
      window_expires_at: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    } : {}),
  }

  const { data, error } = await supabase
    .from('contacts')
    .upsert(upsertData, { onConflict: 'account_id,instagram_user_id' })
    .select()
    .single()

  if (error) {
    console.error('[Engine] Falha ao upsert contato', error)
    return null
  }

  // Se o contato não tem username, buscar perfil via Graph API (async, não bloqueia)
  if (data && !data.username) {
    fetchAndUpdateContactProfile(account, data.id, senderIgId).catch(() => {})
  }

  return data
}

/**
 * Busca username, nome e foto do contato via Instagram Graph API.
 * Chamada async — não bloqueia o fluxo de automação.
 */
async function fetchAndUpdateContactProfile(
  account: AccountRow,
  contactId: string,
  igUserId: string
): Promise<void> {
  try {
    const { decryptToken } = await import('@/lib/crypto/tokens')
    const token = account.ig_access_token
      ? decryptToken(account.ig_access_token)
      : process.env.INSTAGRAM_DM_TOKEN

    if (!token) return

    const { graphApi } = await import('@/lib/meta/client')
    const { data } = await graphApi<{ id: string; username?: string; name?: string; profile_picture_url?: string }>(
      `https://graph.instagram.com/v21.0/${igUserId}?fields=id,username,name,profile_picture_url`,
      { accessToken: token }
    )

    if (data?.username) {
      const supabase = createServiceClient()
      await supabase.from('contacts').update({
        username: data.username,
        full_name: data.name ?? null,
        profile_pic_url: data.profile_picture_url ?? null,
      }).eq('id', contactId)
    }
  } catch {
    // Não falhar por causa de profile fetch
  }
}
