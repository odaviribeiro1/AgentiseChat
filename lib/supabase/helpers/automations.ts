import { createClient } from '../server'
import type { AutomationRow, StepRow, StepWithChildren } from '../types'

/**
 * Busca todas as automações ativas de uma conta com trigger_type específico.
 * Usado pelo motor de automações para avaliar triggers.
 */
export async function getActiveAutomations(
  accountId: string,
  triggerType: string
): Promise<AutomationRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('automations')
    .select('*')
    .eq('account_id', accountId)
    .eq('status', 'active')
    .eq('trigger_type', triggerType)

  if (error) throw error
  return data ?? []
}

/**
 * Busca os steps de uma automação e monta a árvore de steps com filhos.
 */
export async function getAutomationStepsTree(
  automationId: string
): Promise<StepWithChildren[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('steps')
    .select('*')
    .eq('automation_id', automationId)
    .order('position', { ascending: true })

  if (error) throw error

  const steps = (data ?? []) as StepRow[]
  const map = new Map<string, StepWithChildren>()
  const roots: StepWithChildren[] = []

  steps.forEach(step => {
    map.set(step.id, { ...step, children: [], config: step.config as never })
  })

  steps.forEach(step => {
    const node = map.get(step.id)!
    if (step.parent_step_id) {
      const parent = map.get(step.parent_step_id)
      if (parent) parent.children.push(node)
    } else {
      roots.push(node)
    }
  })

  return roots
}
