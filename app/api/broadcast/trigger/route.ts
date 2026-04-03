import { NextRequest, NextResponse, after } from 'next/server'
import { processBroadcast } from '@/lib/queue/broadcast'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Missing broadcast ID' }, { status: 400 })
  }

  // Usar after() para manter a função viva na Vercel após o response
  after(async () => {
    try {
      await processBroadcast(id)
    } catch (err) {
      console.error('[Broadcast/Trigger] Erro ao processar broadcast', { id, err })
    }
  })

  return NextResponse.json({ success: true, message: 'Broadcast triggered' })
}
