import { createClient } from '../server'
import type { MessageRow } from '../types'

/**
 * Retorna o histórico de mensagens de um contato, ordenado do mais recente.
 * Usado na visualização de conversa no inbox.
 */
export async function getConversation(
  contactId: string,
  limit = 50
): Promise<MessageRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('contact_id', contactId)
    .order('sent_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data ?? []
}
