import { createClient } from '../server'
import type { ContactRow, ContactWithWindow } from '../types'

/**
 * Retorna todos os contatos de uma conta com indicador de janela de 24h.
 * Usado na listagem de contatos e na seleção de destinatários de broadcast.
 */
export async function getContactsWithWindow(accountId: string): Promise<ContactWithWindow[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('account_id', accountId)
    .eq('is_blocked', false)
    .eq('opted_out', false)
    .order('last_message_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map(contact => {
    const windowExpires = contact.window_expires_at
      ? new Date(contact.window_expires_at)
      : null
    const isWithinWindow = windowExpires ? windowExpires > new Date() : false
    const minutesRemaining = isWithinWindow && windowExpires
      ? Math.floor((windowExpires.getTime() - Date.now()) / 60000)
      : null

    return {
      ...contact,
      is_within_window: isWithinWindow,
      window_minutes_remaining: minutesRemaining,
    }
  })
}

/**
 * Conta contatos dentro da janela de 24h — usado no dashboard e no broadcast.
 */
export async function countContactsInWindow(
  accountId: string,
  tags?: string[]
): Promise<number> {
  const supabase = await createClient()
  const now = new Date().toISOString()

  let query = supabase
    .from('contacts')
    .select('id', { count: 'exact', head: true })
    .eq('account_id', accountId)
    .eq('is_blocked', false)
    .eq('opted_out', false)
    .gt('window_expires_at', now)

  if (tags && tags.length > 0) {
    query = query.overlaps('tags', tags)
  }

  const { count, error } = await query
  if (error) throw error
  return count ?? 0
}

/**
 * Atualiza a janela de 24h do contato após receber uma mensagem.
 * Deve ser chamado em TODA mensagem inbound recebida.
 */
export async function refreshContactWindow(contactId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('contacts')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', contactId)
  if (error) throw error
}

/**
 * Aplica opt-out imediato ao contato.
 * Chamado quando o contato responde PARAR, STOP, CANCELAR.
 */
export async function optOutContact(contactId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('contacts')
    .update({ opted_out: true })
    .eq('id', contactId)
  if (error) throw error
}

/**
 * Upsert de contato — cria se não existe, atualiza se já existe.
 * Usado pelo motor de automações ao receber um evento de um novo usuário.
 */
export async function upsertContact(
  accountId: string,
  instagramUserId: string,
  data: { username?: string; full_name?: string; profile_pic_url?: string }
): Promise<ContactRow> {
  const supabase = await createClient()
  const { data: contact, error } = await supabase
    .from('contacts')
    .upsert(
      {
        account_id: accountId,
        instagram_user_id: instagramUserId,
        ...data,
        last_message_at: new Date().toISOString(),
      },
      { onConflict: 'account_id,instagram_user_id' }
    )
    .select()
    .single()

  if (error) throw error
  return contact
}
