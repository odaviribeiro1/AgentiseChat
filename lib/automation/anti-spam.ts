import { createServiceClient } from '@/lib/supabase/server'

interface CanSendParams {
  contactId: string
  automationId: string
  maxTriggerHours: number     // config.max_triggers_per_user_hours da automação
}

/**
 * Verifica se é seguro enviar mensagem para o contato nesta automação.
 * Deve ser chamada ANTES de criar qualquer automation_run.
 */
export async function canSendToContact(params: CanSendParams): Promise<{
  allowed: boolean
  reason?: string
}> {
  const { contactId, automationId, maxTriggerHours } = params
  const supabase = createServiceClient()

  // Buscar dados do contato
  const { data: contact } = await supabase
    .from('contacts')
    .select('is_blocked, opted_out')
    .eq('id', contactId)
    .single()

  if (!contact) return { allowed: false, reason: 'Contato não encontrado' }

  // 1. Contato bloqueado manualmente
  if (contact.is_blocked) {
    return { allowed: false, reason: 'Contato bloqueado' }
  }

  // 2. Contato fez opt-out (respondeu PARAR/STOP)
  if (contact.opted_out) {
    return { allowed: false, reason: 'Contato fez opt-out' }
  }

  // 3. Já existe um run ativo desta automação para este contato
  const { data: activeRun } = await supabase
    .from('automation_runs')
    .select('id')
    .eq('contact_id', contactId)
    .eq('automation_id', automationId)
    .in('status', ['running', 'waiting_reply'])
    .maybeSingle()

  if (activeRun) {
    return { allowed: false, reason: 'Run ativo em andamento' }
  }

  // 4. Recebeu mensagem desta automação dentro da janela de cooldown
  if (maxTriggerHours > 0) {
    const cooldownStart = new Date(
      Date.now() - maxTriggerHours * 60 * 60 * 1000
    ).toISOString()

    const { data: recentRun } = await supabase
      .from('automation_runs')
      .select('id')
      .eq('contact_id', contactId)
      .eq('automation_id', automationId)
      .eq('status', 'completed')
      .gte('completed_at', cooldownStart)
      .maybeSingle()

    if (recentRun) {
      return { allowed: false, reason: `Cooldown ativo (${maxTriggerHours}h)` }
    }
  }

  return { allowed: true }
}

/**
 * Verifica se uma mensagem de texto é um pedido de opt-out.
 */
export function isOptOutMessage(text: string): boolean {
  const OPT_OUT_KEYWORDS = ['parar', 'stop', 'cancelar', 'sair', 'descadastrar', 'pare', 'remover']
  return OPT_OUT_KEYWORDS.includes(text.toLowerCase().trim())
}
