'use client'

import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/lib/supabase/types'

export async function getUserRole(): Promise<UserRole | null> {
  const supabase = createClient()
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
