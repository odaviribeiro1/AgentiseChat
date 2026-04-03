import crypto from 'crypto'
import type {
  MetaWebhookPayload,
  MetaMessaging,
  NormalizedWebhookEvent,
} from './types'

// ─── Verificação de assinatura HMAC ──────────────────────────────────────────
/**
 * Verifica a assinatura HMAC-SHA256 do webhook da Meta.
 * DEVE ser chamada antes de qualquer processamento.
 * Nunca revelar se a assinatura é inválida — retornar 200 silenciosamente.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null
): boolean {
  if (!signatureHeader) return false
  if (!process.env.META_APP_SECRET) {
    console.error('[Webhook] META_APP_SECRET não configurado')
    return false
  }

  const expected = crypto
    .createHmac('sha256', process.env.META_APP_SECRET)
    .update(rawBody, 'utf8')
    .digest('hex')

  const received = signatureHeader.replace('sha256=', '')

  // timingSafeEqual para evitar timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(received, 'hex')
    )
  } catch {
    return false
  }
}

// ─── Parser de eventos ────────────────────────────────────────────────────────
/**
 * Transforma o payload bruto da Meta API em eventos normalizados.
 * Um único payload pode conter múltiplos eventos.
 */
export function parseWebhookPayload(
  payload: MetaWebhookPayload
): NormalizedWebhookEvent[] {
  const events: NormalizedWebhookEvent[] = []

  for (const entry of payload.entry) {
    // Eventos de comentário (via changes[])
    if (entry.changes) {
      for (const change of entry.changes) {
        if (change.field === 'comments' && change.value) {
          events.push({
            type: 'comment',
            accountIgId: entry.id,
            senderIgId: change.value.from.id,
            senderUsername: change.value.from.username,
            timestamp: new Date(change.value.timestamp * 1000),
            raw: payload,
            comment: {
              id: change.value.id,
              text: change.value.text,
              postId: change.value.media.id,
              mediaType: change.value.media.media_product_type,
              parentCommentId: change.value.parent_id,
            },
          })
        }
      }
    }

    // Eventos de mensagem (via messaging[])
    if (entry.messaging) {
      for (const msg of entry.messaging) {
        events.push(parseMessagingEvent(entry.id, msg, payload))
      }
    }
  }

  return events
}

function parseMessagingEvent(
  accountIgId: string,
  msg: MetaMessaging,
  raw: MetaWebhookPayload
): NormalizedWebhookEvent {
  const base = {
    accountIgId,
    senderIgId: msg.sender.id,
    timestamp: new Date(msg.timestamp),
    raw,
  }

  // Evento de leitura
  if (msg.read) {
    return { ...base, type: 'dm_read' }
  }

  // Evento de entrega
  if (msg.delivery) {
    return { ...base, type: 'dm_delivery' }
  }

  // Evento de mensagem
  if (msg.message) {
    const m = msg.message

    // Quick Reply (clique em botão)
    if (m.quick_reply) {
      return {
        ...base,
        type: 'dm_quick_reply',
        message: {
          mid: m.mid,
          text: m.text,
          quickReplyPayload: m.quick_reply.payload,
          isStoryReply: false,
        },
      }
    }

    // Story reply
    if (m.reply_to?.story) {
      return {
        ...base,
        type: 'dm_story_reply',
        message: {
          mid: m.mid,
          text: m.text,
          isStoryReply: true,
        },
      }
    }

    // Imagem
    if (m.attachments?.some(a => a.type === 'image')) {
      const img = m.attachments?.find(a => a.type === 'image')
      return {
        ...base,
        type: 'dm_image',
        message: {
          mid: m.mid,
          imageUrl: img?.payload.url,
          isStoryReply: false,
        },
      }
    }

    // Texto simples
    return {
      ...base,
      type: 'dm_text',
      message: {
        mid: m.mid,
        text: m.text,
        isStoryReply: false,
      },
    }
  }

  return { ...base, type: 'unknown' }
}
