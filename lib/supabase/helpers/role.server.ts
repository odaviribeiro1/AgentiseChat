import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/lib/supabase/types'

export async function getUserRole(): Promise<UserRole | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (!data) return null
  return (data.role === 'admin' ? 'admin' : 'operator')
}

export async function requireAdmin(): Promise<void> {
  const role = await getUserRole()
  if (role !== 'admin') {
    throw new Error('Acesso restrito: apenas administradores podem executar esta ação.')
  }
}
