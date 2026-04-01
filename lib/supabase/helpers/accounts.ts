import { createClient } from '../server'
import type { AccountRow } from '../types'

/**
 * Busca a conta conectada do usuário autenticado.
 * Retorna null se não tiver conta conectada ainda.
 */
export async function getAccountByUserId(userId: string): Promise<AccountRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle()

  if (error) throw error
  return data
}
