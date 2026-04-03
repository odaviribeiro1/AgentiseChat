import { sendImageMessage } from '@/lib/meta/messages'
import { interpolateVariables } from '../variables'
import type { StepRow, ImageMessageStepConfig } from '@/lib/supabase/types'
import type { StepExecutionContext } from '../executor'
import type { StepResult } from './index'

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

export async function executeImageMessageStep(
  step: StepRow,
  ctx: StepExecutionContext
): Promise<StepResult> {
  const config = step.config as unknown as ImageMessageStepConfig
  const caption = config.caption
    ? interpolateVariables(config.caption, { contact: ctx.contact })
    : undefined

  let result
  if (ctx.triggerCommentId && ctx.isFirstMessage) {
    // 1. Private Reply com legenda (abre janela)
    const { sendPrivateReply, sendImageMessageIg } = await import('@/lib/meta/messages')
    // Private Reply abre a janela — usar texto curto para não duplicar com a imagem
    result = await sendPrivateReply(ctx.triggerCommentId, '📩', ctx.account.access_token, ctx.igAccessToken)

    if (!result) {
      return { success: false, nextStepId: null, error: 'Falha ao enviar Private Reply' }
    }

    // 2. Delay + enviar imagem real via DM regular
    await sleep(2000)
    if (ctx.igAccessToken) {
      const imgResult = await sendImageMessageIg(
        ctx.contact.instagram_user_id,
        config.image_url,
        caption,
        ctx.igAccessToken
      )
      if (imgResult) result = imgResult
    }
  } else {
    result = await sendImageMessage(
      ctx.contact.instagram_user_id,
      config.image_url,
      caption,
      ctx.account.access_token,
      ctx.account.instagram_user_id
    )
  }

  if (!result) {
    return { success: false, nextStepId: null, error: 'Falha ao enviar imagem' }
  }

  const nextStep = ctx.allSteps.find(
    s => s.parent_step_id === step.id && !s.branch_value
  )

  return { success: true, nextStepId: nextStep?.id ?? null, metaMessageId: result.message_id }
}
