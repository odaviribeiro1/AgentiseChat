import { createServiceClient } from '@/lib/supabase/server'
import { executeStep } from './steps'
import type { StepRow, ContactRow, AccountRow } from '@/lib/supabase/types'
import type { Json } from '@/lib/supabase/database.types'

export interface StepExecutionContext {
  runId: string
  account: AccountRow
  contact: ContactRow           // mutável — steps de tag atualizam ctx.contact.tags
  allSteps: StepRow[]           // todos os steps da automação (para navegação)
  triggerPostTitle?: string     // título/ID do post que disparou o trigger
  triggerCommentId?: string     // ID do comentário para Private Replies
  isFirstMessage?: boolean      // identifica se é a primeira mensagem do fluxo
  igAccessToken?: string        // Instagram Token (IGAA) para graph.instagram.com messaging
}

/**
 * Executa um fluxo de automação do primeiro step até o fim.
 * Atualiza o status do automation_run em tempo real.
 */
export async function executeAutomationRun(
  runId: string,
  firstStepId: string,
  ctx: Omit<StepExecutionContext, 'runId'>
): Promise<void> {
  const supabase = createServiceClient()
  const fullCtx: StepExecutionContext = { ...ctx, runId, isFirstMessage: true }

  let currentStepId: string | null = firstStepId

  while (currentStepId) {
    const step = fullCtx.allSteps.find(s => s.id === currentStepId)
    if (!step) {
      console.error('[Executor] Step não encontrado:', currentStepId)
      await updateRunStatus(runId, 'failed', 'Step não encontrado')
      return
    }

    // Atualizar current_step_id no run
    await supabase
      .from('automation_runs')
      .update({ current_step_id: currentStepId })
      .eq('id', runId)

    console.log(`[Executor] Executando step ${step.type} (${step.id})`, { runId })

    const result = await executeStep(step, fullCtx)

    // Registrar mensagem enviada no log
    if (result.metaMessageId) {
      const msgType = step.type === 'quick_reply' ? 'quick_reply'
        : step.type === 'cta_button' ? 'cta_button'
          : step.type === 'image_message' ? 'image'
            : 'text'

      await supabase.from('messages').insert({
        account_id: fullCtx.account.id,
        contact_id: fullCtx.contact.id,
        direction: 'outbound',
        type: msgType,
        content: step.config as Json,
        meta_message_id: result.metaMessageId,
        automation_run_id: runId,
        step_id: step.id,
      })
    }

    if (!result.success) {
      console.error('[Executor] Falha no step', { stepId: step.id, error: result.error })
      await updateRunStatus(runId, 'failed', result.error)
      return
    }

    // quick_reply → aguardar resposta do contato (Módulo 5 retoma o fluxo)
    if (!result.nextStepId && step.type === 'quick_reply') {
      await updateRunStatus(runId, 'waiting_reply')
      return
    }

    const wasFirstMessage = fullCtx.isFirstMessage

    if (result.success && ['message', 'image_message', 'quick_reply', 'cta_button'].includes(step.type)) {
      fullCtx.isFirstMessage = false
    }

    // Após Private Reply (primeiro envio em fluxo de comentário), pausar o run.
    // O usuário precisa responder à DM para abrir a janela de 24h antes de continuar.
    // Exceção: se não há próximo step (automação de 1 step), deixa completar normalmente.
    if (fullCtx.triggerCommentId && wasFirstMessage && result.success && result.nextStepId
        && ['message', 'image_message', 'quick_reply', 'cta_button'].includes(step.type)) {
      await supabase
        .from('automation_runs')
        .update({ current_step_id: result.nextStepId })
        .eq('id', runId)
      await updateRunStatus(runId, 'waiting_reply')
      console.log(`[Executor] Run ${runId} pausado após Private Reply — aguardando resposta do contato`)
      return
    }

    currentStepId = result.nextStepId
  }

  // Chegou ao fim do fluxo sem erros
  await updateRunStatus(runId, 'completed')
  console.log(`[Executor] Run ${runId} concluído com sucesso`)
}

async function updateRunStatus(
  runId: string,
  status: 'running' | 'completed' | 'failed' | 'waiting_reply' | 'cancelled',
  errorMessage?: string
): Promise<void> {
  const supabase = createServiceClient()
  await supabase
    .from('automation_runs')
    .update({
      status,
      completed_at: ['completed', 'failed'].includes(status)
        ? new Date().toISOString()
        : undefined,
      error_message: errorMessage ?? null,
    })
    .eq('id', runId)
}

/**
 * Tenta retomar um automation_run que estava aguardando resposta do contato.
 * Módulo 5 (Respostas por DM).
 */
export async function resumeAutomationRun(
  contactId: string,
  payloadOrText: string,
  isQuickReplyClick = false
): Promise<boolean> {
  const supabase = createServiceClient()

  // 1. Encontrar run em waiting_reply para o contato
  const { data: run } = await supabase
    .from('automation_runs')
    .select('*')
    .eq('contact_id', contactId)
    .eq('status', 'waiting_reply')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!run || !run.current_step_id) return false

  // 2. Buscar steps da automação
  const { data: steps } = await supabase
    .from('steps')
    .select('*')
    .eq('automation_id', run.automation_id)
    .order('position', { ascending: true })

  if (!steps?.length) return false

  // 3. Buscar Conta e Contato completos para o Contexto
  const { data: contact } = await supabase.from('contacts').select('*').eq('id', contactId).single()
  if (!contact) return false

  const { data: accountRaw } = await supabase.from('accounts').select('*').eq('id', contact.account_id).single()
  if (!accountRaw) return false

  // Decifrar tokens antes de usar
  const { decryptToken } = await import('@/lib/crypto/tokens')
  const account = { ...accountRaw, access_token: decryptToken(accountRaw.access_token) }
  const igAccessToken = accountRaw.ig_access_token
    ? decryptToken(accountRaw.ig_access_token)
    : process.env.INSTAGRAM_DM_TOKEN

  // 4. Determinar o próximo step (com base nos filhos do current_step)
  const currentStep = steps.find(s => s.id === run.current_step_id)
  if (!currentStep) return false

  // Se o run pausou após Private Reply (step atual NÃO é quick_reply),
  // current_step_id já aponta para o próximo step a executar.
  // Retomar diretamente sem triggerCommentId (agora o contato tem janela de 24h).
  if (currentStep.type !== 'quick_reply') {
    await updateRunStatus(run.id, 'running')
    try {
      await executeAutomationRun(run.id, currentStep.id, {
        account,
        contact,
        allSteps: steps,
        igAccessToken,
      })
    } catch (err) {
      console.error('[Executor] Erro fatal no resume pós-Private Reply', err)
    }
    return true
  }

  // ── Quick Reply: verificar se precisa enviar botões reais ──────────────
  // Se o usuário respondeu com texto livre (não clicou botão) E o run foi
  // disparado por comentário → enviar quick replies com botões reais via IG API.
  // Os botões reais só podem ser enviados via DM regular (não Private Reply).
  if (!isQuickReplyClick && run.trigger_event_id) {
    const config = currentStep.config as unknown as import('@/lib/supabase/types').QuickReplyStepConfig
    const { interpolateVariables } = await import('./variables')
    const text = interpolateVariables(config.text, { contact })

    const { sendQuickRepliesIg } = await import('@/lib/meta/messages')
    if (igAccessToken) {
      const result = await sendQuickRepliesIg(
        contact.instagram_user_id,
        text,
        config.buttons,
        igAccessToken
      )
      if (result) {
        console.log(`[Executor] Quick replies com botões reais enviados para contato ${contactId}`)
      } else {
        console.error(`[Executor] Falha ao enviar quick replies reais para contato ${contactId}`)
      }
    }
    // Manter em waiting_reply — aguardar clique no botão
    return true
  }

  // ── Quick Reply: branching por clique de botão ─────────────────────────
  const childSteps = steps.filter(s => s.parent_step_id === currentStep.id)
  if (!childSteps.length) {
    await updateRunStatus(run.id, 'completed')
    return true
  }

  // Tenta bater a resposta com o branch_value
  const nextStep = childSteps.find(s =>
    s.branch_value && s.branch_value.toLowerCase() === payloadOrText.toLowerCase()
  )

  if (!nextStep) {
    const defaultStep = childSteps.find(s => !s.branch_value)
    if (defaultStep) {
      await updateRunStatus(run.id, 'running')
      try {
        await executeAutomationRun(run.id, defaultStep.id, {
          account,
          contact,
          allSteps: steps,
          igAccessToken,
        })
      } catch (err) {
        console.error('[Executor] Erro fatal no resume', err)
      }
      return true
    }
    return false
  }

  // Retomando no branch encontrado
  await updateRunStatus(run.id, 'running')

  try {
    await executeAutomationRun(run.id, nextStep.id, {
      account,
      contact,
      allSteps: steps,
      igAccessToken,
    })
  } catch (err) {
    console.error('[Executor] Erro fatal no executor durante resume:', err)
  }

  return true
}
