import { redirect } from 'next/navigation'
import { UserCog } from 'lucide-react'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { isOwnerRole } from '@/lib/supabase/types'
import { TeamPanel } from '@/components/team/TeamPanel'

export default async function EquipePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || !isOwnerRole(profile.role as never)) {
    redirect('/dashboard')
  }

  const service = createServiceClient()

  // 'invites' criada na migration 0016; database.types.ts ainda não foi regenerado.
  const serviceUntyped = service as unknown as {
    from: (t: string) => {
      select: (cols: string) => {
        order: (col: string, opts?: { ascending: boolean }) => Promise<{ data: Array<Record<string, unknown>> | null }>
      }
    }
  }

  const [{ data: members }, { data: invites }] = await Promise.all([
    service.from('user_profiles').select('id, role, created_at').order('created_at'),
    serviceUntyped.from('invites').select('id, email, role, expires_at, used_at, revoked_at, created_at').order('created_at', { ascending: false }),
  ])

  // Buscar emails dos members via service role
  const memberIds = (members ?? []).map(m => m.id)
  const memberEmails = new Map<string, string>()
  for (const id of memberIds) {
    const { data: u } = await service.auth.admin.getUserById(id)
    if (u?.user?.email) memberEmails.set(id, u.user.email)
  }

  const membersWithEmail = (members ?? []).map(m => ({
    id: m.id,
    role: m.role as string,
    created_at: m.created_at ?? new Date().toISOString(),
    email: memberEmails.get(m.id) ?? '—',
  }))

  type InviteRow = {
    id: string
    email: string
    role: string
    expires_at: string
    used_at: string | null
    revoked_at: string | null
    created_at: string
  }
  const invitesTyped: InviteRow[] = (invites as unknown as InviteRow[] | null) ?? []

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[rgba(59,130,246,0.12)] text-[#3B82F6] flex items-center justify-center">
          <UserCog className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#F8FAFC]">Equipe</h1>
          <p className="text-sm text-[#94A3B8] mt-0.5">Gerencie membros e convites desta instância.</p>
        </div>
      </div>

      <TeamPanel members={membersWithEmail} invites={invitesTyped} />
    </div>
  )
}
