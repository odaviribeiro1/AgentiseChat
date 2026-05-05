import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { isOwnerRole } from '@/lib/supabase/types'

// DELETE /api/team/invites/[id] — revoga convite (owner-only)
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || !isOwnerRole(profile.role as never)) {
    return NextResponse.json({ error: 'Apenas o owner pode revogar convites' }, { status: 403 })
  }

  const service = createServiceClient() as unknown as {
    from: (t: string) => {
      update: (row: Record<string, unknown>) => {
        eq: (col: string, val: string) => {
          is: (col: string, val: null) => {
            is: (col: string, val: null) => Promise<{ error: { message: string } | null }>
          }
        }
      }
    }
  }
  const { error } = await service
    .from('invites')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id)
    .is('used_at', null)
    .is('revoked_at', null)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
