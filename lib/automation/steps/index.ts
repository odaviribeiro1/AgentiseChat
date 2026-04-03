import type { StepRow } from '@/lib/supabase/types'
import type { StepExecutionContext } from '../executor'

import { executeMessageStep }      from './message'
import { executeImageMessageStep } from './image-message'
import { executeQuickReplyStep }   from './quick-reply'
import { executeCtaButtonStep }    from './cta-button'
import { executeDelayStep }        from './delay'
import { executeAiStep }           from './ai'
import { executeConditionStep }    from './condition'
import { executeTagStep }          from './tag'
import { executeEndStep }          from './end'

export interface StepResult {
  success: boolean
  nextStepId: string | null     // null = fim do fluxo
  error?: string
  metaMessageId?: string        // ID da mensagem enviada pela Meta API
}

/** Encontra o próximo step: filho direto (árvore) ou próximo linear (position) */
export function findNextStep(step: StepRow, allSteps: StepRow[]): StepRow | undefined {
  const child = allSteps.find(s => s.parent_step_id === step.id && !s.branch_value)
  if (child) return child
  return allSteps
    .filter(s => !s.parent_step_id && s.position > step.position)
    .sort((a, b) => a.position - b.position)[0]
}

export async function executeStep(
  step: StepRow,
  ctx: StepExecutionContext
): Promise<StepResult> {
  switch (step.type) {
    case 'message':       return executeMessageStep(step, ctx)
    case 'image_message': return executeImageMessageStep(step, ctx)
    case 'quick_reply':   return executeQuickReplyStep(step, ctx)
    case 'cta_button':    return executeCtaButtonStep(step, ctx)
    case 'delay':         return executeDelayStep(step, ctx)
    case 'ai':            return executeAiStep(step, ctx)
    case 'condition':     return executeConditionStep(step, ctx)
    case 'tag':           return executeTagStep(step, ctx)
    case 'end':           return executeEndStep(step, ctx)
    default:
      console.error('[Steps] Tipo de step desconhecido:', step.type)
      return { success: false, nextStepId: null, error: `Tipo desconhecido: ${step.type}` }
  }
}
