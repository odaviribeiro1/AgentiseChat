'use client'

import { useEffect, useState } from 'react'
import { getUserRole } from './role.client'
import type { UserRole } from '@/lib/supabase/types'

export function useUserRole(): { role: UserRole | null; loading: boolean } {
  const [role, setRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    getUserRole()
      .then(r => { if (mounted) setRole(r) })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [])

  return { role, loading }
}
