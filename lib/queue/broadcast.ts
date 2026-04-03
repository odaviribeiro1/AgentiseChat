import { createServiceClient } from '@/lib/supabase/server'
import { sendTextMessage, sendImageMessage, sendCtaButton, sendQuickRepliesIg, sendCtaButtonIg, sendImageMessageIg } from '@/lib/meta/messages'
import { decryptToken } from '@/lib/crypto/tokens'
import { graphApi } from '@/lib/meta/client'
import type { BroadcastMessageConfig } from '@/lib/supabase/types'
import type { MetaSendMessageResponse } from '@/lib/meta/types'

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/**
 * Retry com backoff exponencial: 1s → 2s → 4s (3 tentativas).
 * Apenas incrementa falha após esgotar todas as tentativas.
 */
async function withRetry<T>(
  fn: () => Promise<T | null>,
  maxAttempts = 3
): Promise<T | null> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await fn()
    if (result !== null) return result
    if (attempt < maxAttempts) {
      await sleep(Math.pow(2, attempt - 1) * 1000) // 1s, 2s, 4s
    }
  }
  return null
}

/**
 * Processador de fila para broadcasts.
 * Respeita o rate limit da Meta (200 msg/s) via delay entre envios.
 */
export async function processBroadcast(broadcastId: string) {
  const supabase = createServiceClient()

  // 1. Marca como "sending"
  await supabase
    .from('broadcasts')
    .update({ status: 'sending', started_at: new Date().toISOString() })
    .eq('id', broadcastId)

  // 2. Traz o broadcast completo
  const { data: broadcast } = await supabase
    .from('broadcasts')
    .select('*')
    .eq('id', broadcastId)
    .single()

  if (!broadcast || broadcast.status === 'cancelled') return

  // 3. Buscar tokens da conta (IGAA para messaging via graph.instagram.com)
  const { data: account } = await supabase
    .from('accounts')
    .select('access_token, ig_access_token')
    .eq('id', broadcast.account_id)
    .eq('is_active', true)
    .maybeSingle()

  const igAccessToken = account?.ig_access_token
    ? decryptToken(account.ig_access_token)
    : process.env.INSTAGRAM_DM_TOKEN

  if (!igAccessToken) {
    console.error('[Broadcast] Sem Instagram Token (IGAA) para enviar mensagens')
    await supabase.from('broadcasts').update({ status: 'failed', error_message: 'Sem token IGAA' } as any).eq('id', broadcastId)
    return
  }

  // 4. Traz contatos válidos (dentro da janela 24h) com filtro de tags
  let query = supabase
    .from('contacts')
    .select('*')
    .eq('account_id', broadcast.account_id)
    .gt('window_expires_at', new Date().toISOString())
    .eq('opted_out', false)
    .eq('is_blocked', false)

  if (broadcast.segment_tags && broadcast.segment_tags.length > 0) {
    query = query.contains('tags', broadcast.segment_tags)
  }

  const { data: validContacts } = await query

  if (!validContacts || validContacts.length === 0) {
    await supabase
      .from('broadcasts')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        total_recipients: 0,
        total_sent: 0,
        total_failed: 0,
      })
      .eq('id', broadcastId)
    return
  }

  let successCount = 0
  let failedCount = 0
  const messageConfig = broadcast.message_config as unknown as BroadcastMessageConfig

  // 5. Iterar nos contatos com retry e delay anti-spam
  for (const contact of validContacts) {
    let result: { message_id: string } | null = null

    // Enviar via graph.instagram.com com IGAA token
    if (messageConfig.type === 'text') {
      const text = messageConfig.text.replace('{{contact.first_name}}', contact.username ?? '')
      result = await withRetry(async () => {
        const { data } = await graphApi<MetaSendMessageResponse>(
          'https://graph.instagram.com/v21.0/me/messages',
          {
            method: 'POST',
            accessToken: igAccessToken,
            body: { recipient: { id: contact.instagram_user_id }, message: { text } },
          }
        )
        return data
      })
    } else if (messageConfig.type === 'image' && messageConfig.image_url) {
      result = await withRetry(() =>
        sendImageMessageIg(contact.instagram_user_id, messageConfig.image_url!, messageConfig.text || undefined, igAccessToken)
      )
    } else if (messageConfig.type === 'cta_button' && messageConfig.button) {
      result = await withRetry(() =>
        sendCtaButtonIg(
          contact.instagram_user_id,
          messageConfig.text,
          messageConfig.button!.title,
          messageConfig.button!.url,
          igAccessToken
        )
      )
    }

    // Registrar mensagem no log
    if (result?.message_id) {
      await supabase.from('messages').insert({
        account_id: broadcast.account_id,
        contact_id: contact.id,
        direction: 'outbound',
        type: messageConfig.type === 'image' ? 'image' : messageConfig.type === 'cta_button' ? 'cta_button' : 'text',
        content: messageConfig as any,
        meta_message_id: result.message_id,
        broadcast_id: broadcastId,
      })
    }

    if (result?.message_id) {
      successCount++
    } else {
      failedCount++
      console.error(`[Broadcast] Falha definitiva ao enviar para contato ${contact.id}`)
    }

    // Delay de segurança entre cada DM (500ms — bem abaixo do limite de 200/s da Meta)
    await sleep(500)
  }

  // 6. Finalizar broadcast com contagens reais
  await supabase
    .from('broadcasts')
    .update({
      status: failedCount === validContacts.length ? 'failed' : 'sent',
      sent_at: new Date().toISOString(),
      total_recipients: validContacts.length,
      total_sent: successCount,
      total_failed: failedCount,
    })
    .eq('id', broadcastId)

  console.log(
    `[Broadcast ${broadcastId}] Finalizado. ${successCount} enviados, ${failedCount} falhos de ${validContacts.length} destinatários.`
  )
}
