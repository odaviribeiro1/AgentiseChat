// ─── Webhook payload ──────────────────────────────────────────────────────────
export interface MetaWebhookPayload {
  object: 'instagram'
  entry: MetaEntry[]
}

export interface MetaEntry {
  id: string                        // Instagram Business Account ID
  time: number
  changes?: MetaChange[]            // para eventos de comentário
  messaging?: MetaMessaging[]       // para eventos de DM
}

// ─── Eventos de mudança (comentários) ────────────────────────────────────────
export interface MetaChange {
  field: 'comments' | 'live_comments' | 'mentions'
  value: MetaCommentValue
}

export interface MetaCommentValue {
  id: string                        // comment ID
  text: string                      // texto do comentário
  from: MetaUser
  media: {
    id: string                      // post/reel ID
    media_product_type?: 'POST' | 'REEL'
  }
  parent_id?: string                // ID do comentário pai (para respostas)
  timestamp: number
}

// ─── Eventos de mensagem (DM) ─────────────────────────────────────────────────
export interface MetaMessaging {
  sender: MetaUser
  recipient: MetaUser
  timestamp: number
  message?: MetaMessage
  postback?: MetaPostback           // clique em botão Quick Reply
  read?: { watermark: number }
  delivery?: { watermark: number; mids: string[] }
}

export interface MetaMessage {
  mid: string                       // message ID único
  text?: string
  attachments?: MetaAttachment[]
  quick_reply?: {
    payload: string                 // payload do botão clicado
  }
  reply_to?: {
    story?: {
      id: string
      url: string
    }
  }
}

export interface MetaPostback {
  payload: string
  mid: string
}

export interface MetaAttachment {
  type: 'image' | 'video' | 'audio' | 'file' | 'story_mention'
  payload: {
    url?: string
    sticker_id?: number
  }
}

export interface MetaUser {
  id: string                        // Instagram-scoped User ID (IGSID)
  username?: string                 // Username do Instagram (nem sempre presente)
}

// ─── Tipos de evento normalizados (interno) ───────────────────────────────────
export type WebhookEventType =
  | 'comment'
  | 'dm_text'
  | 'dm_quick_reply'
  | 'dm_image'
  | 'dm_story_reply'
  | 'dm_read'
  | 'dm_delivery'
  | 'unknown'

export interface NormalizedWebhookEvent {
  type: WebhookEventType
  accountIgId: string               // ID da conta que recebeu o evento
  senderIgId: string                // ID do usuário que gerou o evento
  senderUsername?: string            // Username do Instagram (quando disponível)
  timestamp: Date
  raw: MetaWebhookPayload           // payload original para log
  // campos específicos por tipo:
  comment?: {
    id: string
    text: string
    postId: string
    mediaType?: string
    parentCommentId?: string
  }
  message?: {
    mid: string
    text?: string
    quickReplyPayload?: string      // payload do botão Quick Reply clicado
    imageUrl?: string
    isStoryReply: boolean
  }
}

// ─── Resposta da Graph API ao enviar DM ───────────────────────────────────────
export interface MetaSendMessageResponse {
  recipient_id: string
  message_id: string
}

export interface MetaErrorResponse {
  error: {
    message: string
    type: string
    code: number
    fbtrace_id: string
  }
}
