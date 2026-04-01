import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature, parseWebhookPayload } from '@/lib/meta/webhook'
import { createServiceClient } from '@/lib/supabase/server'
import { processAutomationEvent } from '@/lib/automation/engine'
import type { MetaWebhookPayload, NormalizedWebhookEvent } from '@/lib/meta/types'

// ─── GET: Verificação do webhook pela Meta ────────────────────────────────────
// A Meta envia um GET com hub.challenge para confirmar o endpoint.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const mode      = searchParams.get('hub.mode')
  const token     = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (
    mode === 'subscribe' &&
    token === process.env.META_VERIFY_TOKEN &&
    challenge
  ) {
    console.log('[Webhook] Verificação de webhook confirmada')
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  console.warn('[Webhook] Tentativa de verificação inválida', { mode, token })
  return new NextResponse('Forbidden', { status: 403 })
}

// ─── POST: Recebimento de eventos da Meta ─────────────────────────────────────
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  // 1. Ler o body como texto puro ANTES de qualquer parse
  //    O stream de um Request só pode ser consumido uma vez —
  //    chamar request.json() primeiro impossibilitaria o cálculo do HMAC.
  let rawBody: string
  try {
    rawBody = await request.text()
  } catch {
    return new NextResponse('OK', { status: 200 })
  }

  // 2. Verificar assinatura HMAC — CRÍTICO
  //    Retornar 200 mesmo se inválido (não revelar ao atacante que falhou)
  const signature = request.headers.get('x-hub-signature-256')
  const isValid = verifyWebhookSignature(rawBody, signature)

  if (!isValid) {
    console.warn('[Webhook] Assinatura HMAC inválida — ignorando payload')
    return new NextResponse('OK', { status: 200 })
  }

  // 3. Parse do payload
  let payload: MetaWebhookPayload
  try {
    payload = JSON.parse(rawBody) as MetaWebhookPayload
  } catch {
    console.error('[Webhook] Payload inválido (não é JSON)')
    return new NextResponse('OK', { status: 200 })
  }

  // 4. Salvar eventos brutos e despachar processamento de forma assíncrona
  //    Promise.allSettled sem await — não bloqueia a resposta de 200ms
  const supabase = createServiceClient()
  const events = parseWebhookPayload(payload)

  Promise.allSettled(
    events.map(event => processWebhookEvent(supabase, event, payload))
  ).catch(err => {
    console.error('[Webhook] Erro no processamento assíncrono', err)
  })

  const elapsed = Date.now() - startTime
  console.log(`[Webhook] Respondido em ${elapsed}ms — ${events.length} evento(s)`)

  return new NextResponse('OK', { status: 200 })
}

// ─── Processamento assíncrono do evento ───────────────────────────────────────
async function processWebhookEvent(
  supabase: ReturnType<typeof createServiceClient>,
  event: NormalizedWebhookEvent,
  rawPayload: MetaWebhookPayload
): Promise<void> {
  // 4a. Salvar evento bruto no log
  const { error: logError } = await supabase
    .from('webhook_events')
    .insert({
      event_type: event.type,
      instagram_user_id: event.senderIgId,
      payload: rawPayload as unknown as import('@/lib/supabase/database.types').Json,
    })

  if (logError) {
    console.error('[Webhook] Falha ao salvar evento no log', {
      type: event.type,
      error: logError.message,
    })
  }

  // 4b. Verificar opt-out em mensagens de texto
  //     Se o contato enviou PARAR/STOP — setar opted_out imediatamente
  if (
    event.type === 'dm_text' &&
    event.message?.text &&
    isOptOutMessage(event.message.text)
  ) {
    await handleOptOut(supabase, event.accountIgId, event.senderIgId)
    await markEventProcessed(supabase, event.type, event.senderIgId)
    return
  }

  // 4c. Atualizar janela de 24h para mensagens inbound
  //     window_expires_at é calculada automaticamente via trigger no banco
  if (['dm_text', 'dm_quick_reply', 'dm_image', 'dm_story_reply'].includes(event.type)) {
    await updateContactWindow(supabase, event.accountIgId, event.senderIgId)
  }

  // 4d. Marcar evento como processado no log
  await markEventProcessed(supabase, event.type, event.senderIgId)

  // 4e. Despachar para o motor de automações (fire and forget)
  if (event.type === 'comment' || event.type === 'dm_text' || event.type === 'dm_quick_reply') {
    processAutomationEvent(event).catch(err => {
      console.error('[Webhook] Erro no motor de automações', { type: event.type, err })
    })
  }

  console.log(`[Webhook] Evento ${event.type} processado — sender: ${event.senderIgId}`)
}

// ─── Helpers internos ─────────────────────────────────────────────────────────
const OPT_OUT_KEYWORDS = ['parar', 'stop', 'cancelar', 'sair', 'descadastrar', 'pare']

function isOptOutMessage(text: string): boolean {
  return OPT_OUT_KEYWORDS.includes(text.toLowerCase().trim())
}

async function handleOptOut(
  supabase: ReturnType<typeof createServiceClient>,
  accountIgId: string,
  senderIgId: string
): Promise<void> {
  const { data: account } = await supabase
    .from('accounts')
    .select('id')
    .eq('instagram_user_id', accountIgId)
    .single()

  if (!account) return

  const { error } = await supabase
    .from('contacts')
    .update({ opted_out: true })
    .eq('account_id', account.id)
    .eq('instagram_user_id', senderIgId)

  if (error) {
    console.error(`[Webhook] Falha ao registrar opt-out para ${senderIgId}`, {
      error: error.message,
    })
  }
}

async function updateContactWindow(
  supabase: ReturnType<typeof createServiceClient>,
  accountIgId: string,
  senderIgId: string
): Promise<void> {
  const { data: account } = await supabase
    .from('accounts')
    .select('id')
    .eq('instagram_user_id', accountIgId)
    .single()

  if (!account) return

  // Upsert do contato — cria se não existe, atualiza last_message_at se já existe
  // window_expires_at é calculada automaticamente via trigger (set_contact_window_expires_at)
  const { error } = await supabase
    .from('contacts')
    .upsert(
      {
        account_id: account.id,
        instagram_user_id: senderIgId,
        last_message_at: new Date().toISOString(),
      },
      { onConflict: 'account_id,instagram_user_id' }
    )

  if (error) {
    console.error('[Webhook] Falha ao atualizar janela do contato', {
      senderIgId,
      error: error.message,
    })
  }
}

async function markEventProcessed(
  supabase: ReturnType<typeof createServiceClient>,
  eventType: string,
  senderIgId: string
): Promise<void> {
  await supabase
    .from('webhook_events')
    .update({ processed: true, processed_at: new Date().toISOString() })
    .eq('event_type', eventType)
    .eq('instagram_user_id', senderIgId)
    .eq('processed', false)
    .order('received_at', { ascending: false })
    .limit(1)
}
