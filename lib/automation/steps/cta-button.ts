import { sendCtaButton } from '@/lib/meta/messages'
import { interpolateVariables } from '../variables'
import { createServiceClient } from '@/lib/supabase/server'
import type { StepRow, CtaButtonStepConfig, CtaButtonButton } from '@/lib/supabase/types'
import type { StepExecutionContext } from '../executor'
import type { StepResult } from './index'

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

/** Converte config antigo (singular) para novo (array de botões) */
function normalizeButtons(config: CtaButtonStepConfig): CtaButtonButton[] {
  if (config.buttons?.length) return config.buttons
  // Retrocompat: config antigo com button_title + url
  if (config.button_title && config.url) {
    return [{ title: config.button_title, url: config.url }]
  }
  return []
}

export async function executeCtaButtonStep(
  step: StepRow,
  ctx: StepExecutionContext
): Promise<StepResult> {
  const config = step.config as unknown as CtaButtonStepConfig
  const text = interpolateVariables(config.text, { contact: ctx.contact })
  const buttons = normalizeButtons(config)

  if (!buttons.length) {
    return { success: false, nextStepId: null, error: 'Nenhum botão configurado' }
  }

  // Aplicar tags configuradas nos botões (no momento do envio)
  const supabase = createServiceClient()
  for (const btn of buttons) {
    if (btn.apply_tag) {
      const { data } = await supabase.from('contacts').select('tags').eq('id', ctx.contact.id).single()
      const currentTags: string[] = (data?.tags as string[]) ?? []
      if (!currentTags.includes(btn.apply_tag)) {
        await supabase.from('contacts').update({ tags: [...currentTags, btn.apply_tag] }).eq('id', ctx.contact.id)
      }
    }
  }

  let result
  if (ctx.triggerCommentId && ctx.isFirstMessage) {
    const { sendPrivateReply, sendCtaButtonIg } = await import('@/lib/meta/messages')
    result = await sendPrivateReply(ctx.triggerCommentId, text, ctx.account.access_token, ctx.igAccessToken)

    if (!result) {
      return { success: false, nextStepId: null, error: 'Falha ao enviar Private Reply' }
    }

    await sleep(2000)
    if (ctx.igAccessToken) {
      const ctaResult = await sendCtaButtonIg(
        ctx.contact.instagram_user_id,
        text,
        buttons,
        ctx.igAccessToken
      )
      if (ctaResult) result = ctaResult
    }
  } else {
    result = await sendCtaButton(
      ctx.contact.instagram_user_id,
      text,
      buttons,
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
