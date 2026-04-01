import { sendQuickReplies } from '@/lib/meta/messages'
import { interpolateVariables } from '../variables'
import type { StepRow, QuickReplyStepConfig } from '@/lib/supabase/types'
import type { StepExecutionContext } from '../executor'
import type { StepResult } from './index'

export async function executeQuickReplyStep(
  step: StepRow,
  ctx: StepExecutionContext
): Promise<StepResult> {
  const config = step.config as unknown as QuickReplyStepConfig
  const text = interpolateVariables(config.text, { contact: ctx.contact })

  const result = await sendQuickReplies(
    ctx.contact.instagram_user_id,
    text,
    config.buttons,
    ctx.account.access_token,
    ctx.account.instagram_user_id
  )

  if (!result) {
    return { success: false, nextStepId: null, error: 'Falha ao enviar quick replies' }
  }

  // Após quick_reply o fluxo fica em waiting_reply.
  // O próximo step é determinado quando o contato clica em um botão (Módulo 5).
  return {
    success: true,
    nextStepId: null,
    metaMessageId: result.message_id,
  }
}
