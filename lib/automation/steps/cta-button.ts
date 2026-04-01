import { sendCtaButton } from '@/lib/meta/messages'
import { interpolateVariables } from '../variables'
import type { StepRow, CtaButtonStepConfig } from '@/lib/supabase/types'
import type { StepExecutionContext } from '../executor'
import type { StepResult } from './index'

export async function executeCtaButtonStep(
  step: StepRow,
  ctx: StepExecutionContext
): Promise<StepResult> {
  const config = step.config as unknown as CtaButtonStepConfig
  const text = interpolateVariables(config.text, { contact: ctx.contact })

  const result = await sendCtaButton(
    ctx.contact.instagram_user_id,
    text,
    config.button_title,
    config.url,
    ctx.account.access_token
  )

  if (!result) {
    return { success: false, nextStepId: null, error: 'Falha ao enviar CTA button' }
  }

  const nextStep = ctx.allSteps.find(
    s => s.parent_step_id === step.id && !s.branch_value
  )

  return { success: true, nextStepId: nextStep?.id ?? null, metaMessageId: result.message_id }
}
