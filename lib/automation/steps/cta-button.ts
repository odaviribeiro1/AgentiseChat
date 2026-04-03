import { sendCtaButton } from '@/lib/meta/messages'
import { interpolateVariables } from '../variables'
import type { StepRow, CtaButtonStepConfig } from '@/lib/supabase/types'
import type { StepExecutionContext } from '../executor'
import type { StepResult } from './index'

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

export async function executeCtaButtonStep(
  step: StepRow,
  ctx: StepExecutionContext
): Promise<StepResult> {
  const config = step.config as unknown as CtaButtonStepConfig
  const text = interpolateVariables(config.text, { contact: ctx.contact })

  let result
  if (ctx.triggerCommentId && ctx.isFirstMessage) {
    // 1. Private Reply com texto (abre janela)
    const { sendPrivateReply, sendCtaButtonIg } = await import('@/lib/meta/messages')
    result = await sendPrivateReply(ctx.triggerCommentId, text, ctx.account.access_token, ctx.igAccessToken)

    if (!result) {
      return { success: false, nextStepId: null, error: 'Falha ao enviar Private Reply' }
    }

    // 2. Delay + enviar CTA real via DM regular
    await sleep(2000)
    if (ctx.igAccessToken) {
      const ctaResult = await sendCtaButtonIg(
        ctx.contact.instagram_user_id,
        text,
        config.button_title,
        config.url,
        ctx.igAccessToken
      )
      if (ctaResult) result = ctaResult
    }
  } else {
    result = await sendCtaButton(
      ctx.contact.instagram_user_id,
      text,
      config.button_title,
      config.url,
      ctx.account.access_token,
      ctx.account.instagram_user_id
    )
  }

  if (!result) {
    return { success: false, nextStepId: null, error: 'Falha ao enviar CTA button' }
  }

  const nextStep = ctx.allSteps.find(
    s => s.parent_step_id === step.id && !s.branch_value
  )

  return { success: true, nextStepId: nextStep?.id ?? null, metaMessageId: result.message_id }
}
