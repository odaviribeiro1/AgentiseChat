import { sendImageMessage } from '@/lib/meta/messages'
import { interpolateVariables } from '../variables'
import type { StepRow, ImageMessageStepConfig } from '@/lib/supabase/types'
import type { StepExecutionContext } from '../executor'
import type { StepResult } from './index'

export async function executeImageMessageStep(
  step: StepRow,
  ctx: StepExecutionContext
): Promise<StepResult> {
  const config = step.config as unknown as ImageMessageStepConfig
  const caption = config.caption
    ? interpolateVariables(config.caption, { contact: ctx.contact })
    : undefined

  const result = await sendImageMessage(
    ctx.contact.instagram_user_id,
    config.image_url,
    caption,
    ctx.account.access_token,
    ctx.account.instagram_user_id
  )

  if (!result) {
    return { success: false, nextStepId: null, error: 'Falha ao enviar imagem' }
  }

  const nextStep = ctx.allSteps.find(
    s => s.parent_step_id === step.id && !s.branch_value
  )

  return { success: true, nextStepId: nextStep?.id ?? null, metaMessageId: result.message_id }
}
