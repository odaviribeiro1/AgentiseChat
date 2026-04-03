import { sendQuickReplies } from '@/lib/meta/messages'
import { interpolateVariables } from '../variables'
import type { StepRow, QuickReplyStepConfig } from '@/lib/supabase/types'
import type { StepExecutionContext } from '../executor'
import type { StepResult } from './index'

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

export async function executeQuickReplyStep(
  step: StepRow,
  ctx: StepExecutionContext
): Promise<StepResult> {
  const config = step.config as unknown as QuickReplyStepConfig
  const text = interpolateVariables(config.text, { contact: ctx.contact })

  let result
  if (ctx.triggerCommentId && ctx.isFirstMessage) {
    // 1. Enviar Private Reply com texto puro (abre a janela de mensagens)
    const { sendPrivateReply, sendQuickRepliesIg } = await import('@/lib/meta/messages')
    result = await sendPrivateReply(ctx.triggerCommentId, text, ctx.account.access_token, ctx.igAccessToken)

    if (!result) {
      return { success: false, nextStepId: null, error: 'Falha ao enviar Private Reply' }
    }

    // 2. Delay de 2s — a Meta pode rejeitar envios em sequência muito rápida
    await sleep(2000)

    // 3. Enviar Quick Replies com botões reais via DM regular (recipient: { id })
    //    O Private Reply abriu a janela, então o DM regular funciona agora.
    if (ctx.igAccessToken && config.buttons.length > 0) {
      const buttonsResult = await sendQuickRepliesIg(
        ctx.contact.instagram_user_id,
        text,
        config.buttons,
        ctx.igAccessToken
      )
      if (buttonsResult) {
        // Usar o message_id dos botões (mais relevante para tracking)
        result = buttonsResult
      }
    }
  } else {
    result = await sendQuickReplies(
      ctx.contact.instagram_user_id,
      text,
      config.buttons,
      ctx.account.access_token,
      ctx.account.instagram_user_id
    )
  }

  if (!result) {
    return { success: false, nextStepId: null, error: 'Falha ao enviar quick replies' }
  }

  // Após quick_reply o fluxo fica em waiting_reply.
  // O próximo step é determinado quando o contato clica em um botão.
  return {
    success: true,
    nextStepId: null,
    metaMessageId: result.message_id,
  }
}
