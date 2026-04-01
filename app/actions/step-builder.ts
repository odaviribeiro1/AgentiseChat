'use server'

import { createServiceClient } from '@/lib/supabase/server'
import type { StepLocal } from '@/lib/stores/step-builder'

export async function saveAutomationSteps(automationId: string, steps: StepLocal[]) {
  const supabase = createServiceClient()

  try {
    // Para simplificar: apaga tudo e recria
    // (Na prática precisaría manter run status se importasse, mas pro Builder base é comum sobrescrever quando se edita fluxo)
    await supabase.from('steps').delete().eq('automation_id', automationId)

    if (steps.length === 0) return { success: true }

    const stepsToInsert = steps.map(s => ({
      id: s.id, // Manter o ID do cliente
      automation_id: automationId,
      parent_step_id: s.parent_step_id,
      branch_value: s.branch_value,
      position: s.position,
      type: s.type,
      config: s.config as any,
    }))

    const { error } = await supabase.from('steps').insert(stepsToInsert)

    if (error) {
      console.error('[saveAutomationSteps] erro', error)
      return { success: false, error: 'Falha ao salvar steps', details: error.message }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: 'Erro inesperado' }
  }
}
