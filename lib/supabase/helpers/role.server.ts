import { createClient } from '@/lib/supabase/server'
import { isOwnerRole, type UserRole } from '@/lib/supabase/types'

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
  return data.role as UserRole
}

export async function isOwner(): Promise<boolean> {
  return isOwnerRole(await getUserRole())
}

export async function requireOwner(): Promise<void> {
  if (!(await isOwner())) {
    throw new Error('Acesso restrito: apenas o owner desta instância pode executar esta ação.')
  }
}

// Compat: helpers antigos continuam funcionando — owner é tratado como admin.
export const requireAdmin = requireOwner
