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

  let result
  if (ctx.triggerCommentId && ctx.isFirstMessage) {
    const { sendPrivateReply } = await import('@/lib/meta/messages')
    // Fallback: private_replies não suporta imagens. Enviamos a legenda e o link.
    const fallbackText = `${caption || 'Aqui está a imagem que você pediu:'}\n\n${config.image_url}\n\n(Dica: Responda a esta mensagem para liberar mais recursos interativos!)`
    result = await sendPrivateReply(ctx.triggerCommentId, fallbackText, ctx.account.access_token, ctx.account.instagram_user_id)
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
