import { createServiceClient } from '@/lib/supabase/server'
import { BroadcastForm } from '@/components/broadcast/BroadcastForm'

export default async function NewBroadcastPage() {
  const supabase = createServiceClient()

  const { data: accounts } = await supabase
    .from('accounts')
    .select('id')
    .eq('is_active', true)
    .limit(1)

  const accountId = accounts?.[0]?.id

  if (!accountId) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <p className="text-[#94A3B8]">Nenhuma conta conectada. Configure sua conta Instagram primeiro.</p>
      </div>
    )
  }

  return <BroadcastForm accountId={accountId} />
}
