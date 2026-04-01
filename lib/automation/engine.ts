import { createServiceClient } from '@/lib/supabase/server'
import { canSendToContact } from './anti-spam'
import { executeAutomationRun } from './executor'
import type { NormalizedWebhookEvent } from '@/lib/meta/types'
import type { AutomationRow, AccountRow, ContactRow, TriggerConfig } from '@/lib/supabase/types'
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
  // Ignorar eventos irrelevantes
  if (!['comment', 'dm_text', 'dm_quick_reply'].includes(event.type)) return

  const supabase = createServiceClient()

  // 1. Encontrar a conta pelo instagram_user_id
  const { data: account } = await supabase
    .from('accounts')
    .select('*')
    .eq('instagram_user_id', event.accountIgId)
    .eq('is_active', true)
    .maybeSingle()

  if (!account) {
    console.warn('[Engine] Conta não encontrada para evento', { accountIgId: event.accountIgId })
    return
  }

  // 2. Upsert do contato que fez a interação
  const contact = await upsertContact(account, event.senderIgId)
  if (!contact) return

  // Módulo 5: Tentar retomar fluxo existente se for mensagem (não comentário)
  if (event.type === 'dm_text' || event.type === 'dm_quick_reply') {
    const { resumeAutomationRun } = await import('./executor')
    const payloadOrText = event.message?.quickReplyPayload || event.message?.text || ''
    
    // Tenta retomar. Se retornar true, o fluxo seguiu. Caso contrário (não tinha nada esperando), pode cair na lógica de novo trigger (Módulo 2, dm_keyword, se houvesse)
    const resumed = await resumeAutomationRun(contact.id, payloadOrText)
    if (resumed) {
      console.log('[Engine] Fluxo retomado com sucesso para contato', contact.id)
      return
    }
  }

  // Se chegou aqui e é apenas um comentário, processa trigger de comentário
  if (event.type === 'comment' && event.comment) {
    // 3. Buscar automações ativas com trigger comment_keyword
    const { data: automations } = await supabase
    .from('automations')
    .select('*')
    .eq('account_id', account.id)
    .eq('status', 'active')
    .eq('trigger_type', 'comment_keyword')

  if (!automations?.length) return

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

  // Verificar keyword
  if (!matchesKeyword(event.comment!.text, config)) return

  // Verificar post específico (se configurado)
  if (config.apply_to === 'specific_post' && config.post_id) {
    if (event.comment!.postId !== config.post_id) return
  }

  // Verificar anti-spam
  const spamCheck = await canSendToContact({
    contactId: contact.id,
    automationId: automation.id,
    maxTriggerHours: config.max_triggers_per_user_hours ?? 24,
  })

  if (!spamCheck.allowed) {
    console.log('[Engine] Anti-spam bloqueou envio', {
      reason: spamCheck.reason,
      contactId: contact.id,
      automationId: automation.id,
    })
    return
  }

  // Buscar todos os steps da automação
  const { data: steps } = await supabase
    .from('steps')
    .select('*')
    .eq('automation_id', automation.id)
    .order('position', { ascending: true })

  if (!steps?.length) {
    console.warn('[Engine] Automação sem steps', { automationId: automation.id })
    return
  }

  // Encontrar o primeiro step (sem parent_step_id)
  const firstStep = steps.find(s => !s.parent_step_id)
  if (!firstStep) {
    console.warn('[Engine] Primeiro step não encontrado', { automationId: automation.id })
    return
  }

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
    console.error('[Engine] Falha ao criar automation_run', runError)
    return
  }

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

  console.log('[Engine] Iniciando run', {
    runId: run.id,
    automationId: automation.id,
    contactId: contact.id,
  })

  // Executar o fluxo — fire and forget (não bloqueia o webhook)
  // Decifrar o access_token antes de passar ao executor
  const { decryptToken } = await import('@/lib/crypto/tokens')
  const accountWithPlainToken = {
    ...account,
    access_token: decryptToken(account.access_token),
  }

  executeAutomationRun(run.id, firstStep.id, {
    account: accountWithPlainToken,
    contact,
    allSteps: steps,
    triggerPostTitle: event.comment!.postId,
  }).catch(err => {
    console.error('[Engine] Erro fatal no executor', { runId: run.id, err })
  })
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
 * Cria se não existe, atualiza last_message_at se já existe.
 * window_expires_at é calculada automaticamente via trigger no banco.
 */
async function upsertContact(
  account: AccountRow,
  senderIgId: string
): Promise<ContactRow | null> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('contacts')
    .upsert(
      {
        account_id: account.id,
        instagram_user_id: senderIgId,
        last_message_at: new Date().toISOString(),
      },
      { onConflict: 'account_id,instagram_user_id' }
    )
    .select()
    .single()

  if (error) {
    console.error('[Engine] Falha ao upsert contato', error)
    return null
  }

  return data
}
