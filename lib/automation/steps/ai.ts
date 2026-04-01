import { runAiStep as callOpenAi } from '@/lib/ai/client'
import { buildConversationContext } from '@/lib/ai/context'
import { interpolateVariables } from '../variables'
import { sendTextMessage } from '@/lib/meta/messages'
import { createServiceClient } from '@/lib/supabase/server'
import type { StepRow, AiStepConfig } from '@/lib/supabase/types'
import type { StepExecutionContext } from '../executor'
import type { StepResult } from './index'

export async function executeAiStep(
  step: StepRow,
  ctx: StepExecutionContext
): Promise<StepResult> {
  const config = step.config as unknown as AiStepConfig
  const supabase = createServiceClient()

  // 1. Substituir variáveis no system_prompt (opcional, pode ser util)
  const systemPrompt = interpolateVariables(config.system_prompt || '', { contact: ctx.contact })

  // 2. Buscar histórico
  // Considera o number of context_messages configurado na UI
  const contextLimit = config.context_messages || 5
  const history = await buildConversationContext(ctx.contact.id, contextLimit)

  // 3. Fazer chamada à API OpenAI
  const responseText = await callOpenAi(ctx.account.id, config.model || 'gpt-4.1-mini', systemPrompt, history)

  if (!responseText) {
    console.warn(`[AiStep] OpenAI retornou null para contact=${ctx.contact.id}. Marcando com requer-humano.`)
    
    // Fallback: aplicar tag e encerrar fluxo
    const tags = Array.isArray(ctx.contact.tags) ? [...ctx.contact.tags] : []
    if (!tags.includes('requer-humano')) {
      tags.push('requer-humano')
      await supabase
        .from('contacts')
        .update({ tags })
        .eq('id', ctx.contact.id)
    }

    return { success: false, nextStepId: null, error: 'OpenAI call failed or returned empty' }
  }

  // 4. Enviar a mensagem final de volta para o cliente
  let result
  if (ctx.triggerCommentId && ctx.isFirstMessage) {
    const { sendPrivateReply } = await import('@/lib/meta/messages')
    result = await sendPrivateReply(ctx.triggerCommentId, responseText, ctx.account.access_token)
  } else {
    result = await sendTextMessage(
      ctx.contact.instagram_user_id,
      responseText,
      ctx.account.access_token,
      ctx.account.instagram_user_id
    )
  }

  if (!result) {
    return { success: false, nextStepId: null, error: 'Falha ao enviar mensagem de AI DM' }
  }

  // 5. Determinar nextStepId caso exista (em geral um step default filho)
  const childSteps = ctx.allSteps.filter(s => s.parent_step_id === step.id)
  const nextStepId = childSteps.length > 0 ? childSteps[0].id : null

  // Sobrescrevermos a prop config injetando o content, pro Executor logar a msg gerada na DB 'messages'
  step.config = { text: responseText } as any

  return {
    success: true,
    nextStepId,
    metaMessageId: result.message_id,
  }
}
