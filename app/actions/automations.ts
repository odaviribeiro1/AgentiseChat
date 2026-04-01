'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

/**
 * Exclui uma automação e todos os seus passos (cascade no banco).
 */
export async function deleteAutomation(id: string) {
  const supabase = createServiceClient()
  
  const { error } = await supabase
    .from('automations')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('[deleteAutomation] erro:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/automacoes')
  return { success: true }
}

/**
 * Renomeia uma automação.
 */
export async function renameAutomation(id: string, newName: string) {
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('automations')
    .update({ name: newName })
    .eq('id', id)

  if (error) {
    console.error('[renameAutomation] erro:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/automacoes')
  return { success: true }
}

/**
 * Alterna entre 'active' e 'paused'.
 */
export async function toggleAutomationStatus(id: string, currentStatus: string) {
  const supabase = createServiceClient()
  const newStatus = currentStatus === 'active' ? 'paused' : 'active'

  const { error } = await supabase
    .from('automations')
    .update({ status: newStatus })
    .eq('id', id)

  if (error) {
    console.error('[toggleAutomationStatus] erro:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/automacoes')
  return { success: true, newStatus }
}

/**
 * Cria uma nova automação básica.
 */
export async function createAutomation(formData: FormData) {
  const name = formData.get('name') as string
  const supabase = createServiceClient()
  
  // Buscar conta ativa
  const { data: accounts } = await supabase.from('accounts').select('id').limit(1)
  const accountId = accounts?.[0]?.id

  if (!accountId) throw new Error('Nenhuma conta encontrada')

  const { data, error } = await supabase.from('automations').insert({
    account_id: accountId,
    name,
    status: 'draft',
    trigger_type: 'comment_keyword',
    trigger_config: {
      keywords: [], 
      match_type: 'contains', 
      post_id: null, 
      apply_to: 'all_posts',
      max_triggers_per_user_hours: 24,
      reply_comment: false,
      reply_comment_text: null
    }
  }).select('id').single()

  if (error) throw error

  if (data?.id) {
    redirect(`/automacoes/${data.id}/editar`)
  }
}
