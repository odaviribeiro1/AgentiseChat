import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { isOwnerRole } from '@/lib/supabase/types'

// GET /api/team/invites — lista convites pendentes (owner-only)
export async function GET() {
  const access = await assertOwner()
  if (!access.ok) return access.response

  const service = createServiceClient() as unknown as {
    from: (t: string) => {
      select: (cols: string) => {
        order: (col: string, opts?: { ascending: boolean }) => Promise<{ data: unknown; error: { message: string } | null }>
      }
      insert: (row: Record<string, unknown>) => {
        select: (cols: string) => {
          single: () => Promise<{ data: { id: string; email: string; expires_at: string; token: string } | null; error: { message: string } | null }>
        }
      }
    }
  }
  const { data, error } = await service
    .from('invites')
    .select('id, email, role, expires_at, used_at, revoked_at, invited_by, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ invites: data })
}

// POST /api/team/invites — cria convite (owner-only)
export async function POST(request: NextRequest) {
  const access = await assertOwner()
  if (!access.ok) return access.response

  let body: { email?: string; role?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const email = body.email?.toLowerCase().trim()
  const role = body.role ?? 'member'

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
  }
  if (role !== 'member') {
    return NextResponse.json({ error: 'Role inválido (apenas "member" permitido em convites)' }, { status: 400 })
  }

  const token = crypto.randomBytes(32).toString('hex')
  const service = createServiceClient() as unknown as {
    from: (t: string) => {
      insert: (row: Record<string, unknown>) => {
        select: (cols: string) => {
          single: () => Promise<{ data: { id: string; email: string; expires_at: string; token: string } | null; error: { message: string } | null }>
        }
      }
    }
  }

  const { data, error } = await service
    .from('invites')
    .insert({
      email,
      token,
      role,
      invited_by: access.userId,
    })
    .select('id, email, expires_at, token')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Erro ao criar convite' }, { status: 500 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const inviteUrl = `${appUrl.replace(/\/$/, '')}/convite?token=${data.token}`

  return NextResponse.json({
    ok: true,
    invite_id: data.id,
    invite_url: inviteUrl,
    expires_at: data.expires_at,
  })
}

async function assertOwner(): Promise<
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse }
> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: 'Não autenticado' }, { status: 401 }) }
  }

  const { data } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (!data || !isOwnerRole(data.role as never)) {
    return { ok: false, response: NextResponse.json({ error: 'Apenas o owner pode gerenciar convites' }, { status: 403 }) }
  }

  return { ok: true, userId: user.id }
}
