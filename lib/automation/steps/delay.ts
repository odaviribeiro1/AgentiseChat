import type { StepRow, DelayStepConfig } from '@/lib/supabase/types'
import type { StepExecutionContext } from '../executor'
import type { StepResult } from './index'

export async function executeDelayStep(
  step: StepRow,
  ctx: StepExecutionContext
): Promise<StepResult> {
  const config = step.config as unknown as DelayStepConfig

  // TODO: Para delays longos (> 30s), usar fila com delayed job em vez de setTimeout inline.
  // setTimeout inline é adequado apenas para delays curtos em desenvolvimento.
  await new Promise(resolve => setTimeout(resolve, config.seconds * 1000))

  const { findNextStep } = await import('./index')
  const nextStep = findNextStep(step, ctx.allSteps)

  return { success: true, nextStepId: nextStep?.id ?? null }
}
