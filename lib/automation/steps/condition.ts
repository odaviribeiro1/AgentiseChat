import type { StepRow, ConditionStepConfig } from '@/lib/supabase/types'
import type { StepExecutionContext } from '../executor'
import type { StepResult } from './index'

export async function executeConditionStep(
  step: StepRow,
  ctx: StepExecutionContext
): Promise<StepResult> {
  const config = step.config as unknown as ConditionStepConfig

  let conditionResult = false

  switch (config.field) {
    case 'tag':
      conditionResult = config.operator === 'has'
        ? (ctx.contact.tags ?? []).includes(config.value)
        : !(ctx.contact.tags ?? []).includes(config.value)
      break

    case 'window_active': {
      const windowExpires = ctx.contact.window_expires_at
      const isActive = windowExpires ? new Date(windowExpires) > new Date() : false
      conditionResult = config.operator === 'is' ? isActive : !isActive
      break
    }

    case 'opted_out':
      conditionResult = config.operator === 'is'
        ? ctx.contact.opted_out ?? false
        : !(ctx.contact.opted_out ?? false)
      break
  }

  // Escolher o branch correto — steps filhos com branch_value 'true' ou 'false'
  const branchValue = conditionResult ? 'true' : 'false'
  const nextStep = ctx.allSteps.find(
    s => s.parent_step_id === step.id && s.branch_value === branchValue
  )

  return { success: true, nextStepId: nextStep?.id ?? null }
}
