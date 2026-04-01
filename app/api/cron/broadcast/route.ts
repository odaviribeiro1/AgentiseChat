import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const supabase = createServiceClient()

  const { data: scheduled, error } = await supabase
    .from('broadcasts')
    .select('id')
    .eq('status', 'scheduled')
    .lte('scheduled_at', new Date().toISOString())
    .limit(10)

  if (error) {
    console.error('[Cron/Broadcast] Falha ao buscar broadcasts agendados', error)
    return NextResponse.json({ error: 'Falha ao buscar broadcasts' }, { status: 500 })
  }

  if (!scheduled || scheduled.length === 0) {
    return NextResponse.json({ triggered: 0 })
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'http://localhost:3000'

  await Promise.allSettled(
    scheduled.map((b) =>
      fetch(`${appUrl}/api/broadcast/trigger?id=${b.id}`).catch((err) => {
        console.error(`[Cron/Broadcast] Falha ao disparar broadcast ${b.id}`, err)
      })
    )
  )

  console.log(`[Cron/Broadcast] ${scheduled.length} broadcasts disparados`)
  return NextResponse.json({ triggered: scheduled.length })
}
