import { NextRequest, NextResponse } from 'next/server'
import { processBroadcast } from '@/lib/queue/broadcast'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Missing broadcast ID' }, { status: 400 })
  }

  // Promise fire and forget: processBroadcast é disparado em background
  // No Vercel free tier, isso pode estourar o limite de tempo (10s), 
  // mas para Serverless Edge/Pro ou container Node, isso roda independente.
  processBroadcast(id).catch(console.error)

  return NextResponse.json({ success: true, message: 'Broadcast triggered' })
}
