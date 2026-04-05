'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthCallbackPage() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        router.push('/dashboard')
      }
    })
    return () => subscription.unsubscribe()
  }, [router, supabase.auth])

  return (
    <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 rounded-full border-2 border-[#3B82F6] border-t-transparent animate-spin" />
        <p className="text-[#94A3B8] text-sm">Autenticando...</p>
      </div>
    </div>
  )
}
