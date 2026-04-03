import { sendTextMessage } from '@/lib/meta/messages'
import { interpolateVariables } from '../variables'
import type { StepRow, MessageStepConfig } from '@/lib/supabase/types'
import type { StepExecutionContext } from '../executor'
import type { StepResult } from './index'

export async function executeMessageStep(
  step: StepRow,
  ctx: StepExecutionContext
): Promise<StepResult> {
  const config = step.config as unknown as MessageStepConfig
  const text = interpolateVariables(config.text, {
    contact: ctx.contact,
    postTitle: ctx.triggerPostTitle,
  })

  let result
  if (ctx.triggerCommentId && ctx.isFirstMessage) {
    const { sendPrivateReply } = await import('@/lib/meta/messages')
    result = await sendPrivateReply(ctx.triggerCommentId, text, ctx.account.access_token, ctx.igAccessToken)
  } else {
    result = await sendTextMessage(ctx.contact.instagram_user_id, text, ctx.account.access_token, ctx.account.instagram_user_id)
  }

  if (!result) {
    return { success: false, nextStepId: null, error: 'Falha ao enviar mensagem' }
  }

  const { findNextStep } = await import('./index')
  const nextStep = findNextStep(step, ctx.allSteps)

  return {
    success: true,
    nextStepId: nextStep?.id ?? null,
    metaMessageId: result.message_id,
  }
}
