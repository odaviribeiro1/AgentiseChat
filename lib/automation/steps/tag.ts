import { createServiceClient } from '@/lib/supabase/server'
import type { StepRow, TagStepConfig } from '@/lib/supabase/types'
import type { StepExecutionContext } from '../executor'
import type { StepResult } from './index'

export async function executeTagStep(
  step: StepRow,
  ctx: StepExecutionContext
): Promise<StepResult> {
  const config = step.config as unknown as TagStepConfig
  const supabase = createServiceClient()

  const currentTags = ctx.contact.tags ?? []
  const newTags = config.action === 'add'
    ? [...new Set([...currentTags, config.tag])]    // adicionar sem duplicatas
    : currentTags.filter(t => t !== config.tag)     // remover

  const { error } = await supabase
    .from('contacts')
    .update({ tags: newTags })
    .eq('id', ctx.contact.id)

  if (error) {
    console.error('[Tag Step] Falha ao atualizar tags', error)
    return { success: false, nextStepId: null, error: 'Falha ao atualizar tag' }
  }

  // Atualizar o contexto local para steps subsequentes verem a tag atualizada
  ctx.contact.tags = newTags

  const nextStep = ctx.allSteps.find(
    s => s.parent_step_id === step.id && !s.branch_value
  )

  return { success: true, nextStepId: nextStep?.id ?? null }
}
