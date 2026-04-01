import { createClient } from '../server'
import type { BroadcastRow, BroadcastInsert } from '../types'

/**
 * Retorna todos os broadcasts de uma conta, ordenados por data de criação.
 */
export async function getBroadcasts(accountId: string): Promise<BroadcastRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('broadcasts')
    .select('*')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

/**
 * Cria um novo broadcast em status draft.
 */
export async function createBroadcast(broadcast: BroadcastInsert): Promise<BroadcastRow> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('broadcasts')
    .insert(broadcast)
    .select()
    .single()

  if (error) throw error
  return data
}
