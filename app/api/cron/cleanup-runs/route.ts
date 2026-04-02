import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * GET /api/cron/cleanup-runs
 *
 * Limpa automation_runs travados que bloqueiam o anti-spam:
 * - waiting_reply há mais de 24h → cancelled (usuário não respondeu)
 * - running há mais de 5min → failed (executor travou)
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const now = new Date()

  // 1. waiting_reply há mais de 24h → cancelled
  const waitingCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const { data: staleWaiting, error: waitErr } = await supabase
    .from('automation_runs')
    .update({
      status: 'cancelled',
      completed_at: now.toISOString(),
      error_message: 'Cancelado automaticamente — sem resposta em 24h',
    })
    .eq('status', 'waiting_reply')
    .lt('started_at', waitingCutoff)
    .select('id')

  // 2. running há mais de 5 minutos → failed
  const runningCutoff = new Date(now.getTime() - 5 * 60 * 1000).toISOString()
  const { data: staleRunning, error: runErr } = await supabase
    .from('automation_runs')
    .update({
      status: 'failed',
      completed_at: now.toISOString(),
      error_message: 'Falhou automaticamente — execução travada por mais de 5min',
    })
    .eq('status', 'running')
    .lt('started_at', runningCutoff)
    .select('id')

  const cancelledCount = staleWaiting?.length ?? 0
  const failedCount = staleRunning?.length ?? 0

  if (cancelledCount > 0 || failedCount > 0) {
    console.log(`[Cron/CleanupRuns] ${cancelledCount} cancelled, ${failedCount} failed`)
  }

  return NextResponse.json({
    cancelled: cancelledCount,
    failed: failedCount,
    errors: [waitErr?.message, runErr?.message].filter(Boolean),
  })
}
