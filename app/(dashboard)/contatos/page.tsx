import { createServiceClient } from '@/lib/supabase/server'
import { ContactsTable } from '@/components/contacts/contacts-table'
import { Users } from 'lucide-react'

export default async function ContactsPage() {
  const supabase = createServiceClient()

  const { data: accounts } = await supabase.from('accounts').select('*').limit(1)
  const accountId = accounts?.[0]?.id

  if (!accountId) {
    return <div>Você precisa configurar uma conta Instagram primeiro.</div>
  }

  // Fetch all contacts
  const { data: contacts } = await supabase
    .from('contacts')
    .select('*')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#EBF3FF] text-[#2B7FFF] flex items-center justify-center">
          <Users className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#1A202C]">Base de Contatos</h1>
          <p className="text-sm text-[#718096] mt-0.5">Gerencie os leads que engajaram com o seu Instagram.</p>
        </div>
      </div>

      <ContactsTable data={contacts || []} />
    </div>
  )
}
