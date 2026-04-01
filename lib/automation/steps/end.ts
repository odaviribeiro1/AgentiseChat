import type { StepRow, EndStepConfig } from '@/lib/supabase/types'
import type { StepExecutionContext } from '../executor'
import type { StepResult } from './index'

export async function executeEndStep(
  step: StepRow,
  ctx: StepExecutionContext
): Promise<StepResult> {
  const config = step.config as unknown as EndStepConfig

  if (config.notify_operator && config.notification_message) {
    // TODO: implementar notificação (email/webhook) para o operador
    console.log('[End Step] Notificação para operador:', {
      contactId: ctx.contact.id,
      message: config.notification_message,
    })
  }

  return { success: true, nextStepId: null }
}
