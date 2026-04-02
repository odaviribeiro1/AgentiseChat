import { graphApi } from './client'
import type { MetaSendMessageResponse } from './types'

// Endpoint de mensagens do Instagram via Graph API
// Usa /{igUserId}/messages com o token da conta
const messagesEndpoint = (senderIgId?: string) =>
  senderIgId ? `${senderIgId}/messages` : 'me/messages'

// ─── Texto simples ────────────────────────────────────────────────────────────
export async function sendTextMessage(
  recipientIgId: string,
  text: string,
  accessToken?: string,
  senderIgId?: string
): Promise<MetaSendMessageResponse | null> {
  const { data, error } = await graphApi<MetaSendMessageResponse>(messagesEndpoint(senderIgId), {
    method: 'POST',
    body: {
      recipient: { id: recipientIgId },
      message: { text },
    },
    accessToken,
  })

  if (error) {
    console.error('[Messages] Falha ao enviar texto', { recipientIgId, error })
    return null
  }

  return data
}

// ─── Imagem + legenda ─────────────────────────────────────────────────────────
export async function sendImageMessage(
  recipientIgId: string,
  imageUrl: string,
  caption?: string,
  accessToken?: string,
  senderIgId?: string
): Promise<MetaSendMessageResponse | null> {
  // Enviar imagem primeiro
  const { data: imgData, error: imgError } = await graphApi<MetaSendMessageResponse>(
    messagesEndpoint(senderIgId),
    {
      method: 'POST',
      body: {
        recipient: { id: recipientIgId },
        message: {
          attachment: {
            type: 'image',
            payload: { url: imageUrl, is_reusable: true },
          },
        },
      },
      accessToken,
    }
  )

  if (imgError || !imgData) {
    console.error('[Messages] Falha ao enviar imagem', { recipientIgId, imgError })
    return null
  }

  // Enviar legenda como texto separado se existir
  if (caption) {
    await sendTextMessage(recipientIgId, caption, accessToken, senderIgId)
  }

  return imgData
}

// ─── Botões de resposta rápida (Quick Replies) ────────────────────────────────
export async function sendQuickReplies(
  recipientIgId: string,
  text: string,
  buttons: Array<{ title: string; payload: string }>,
  accessToken?: string,
  senderIgId?: string
): Promise<MetaSendMessageResponse | null> {
  if (buttons.length > 13) {
    console.warn('[Messages] Quick Replies limitado a 13 botões pela Meta API')
    buttons = buttons.slice(0, 13)
  }

  const { data, error } = await graphApi<MetaSendMessageResponse>(messagesEndpoint(senderIgId), {
    method: 'POST',
    accessToken,
    body: {
      recipient: { id: recipientIgId },
      message: {
        text,
        quick_replies: buttons.map(b => ({
          content_type: 'text',
          title: b.title.slice(0, 20),  // limite da Meta: 20 chars
          payload: b.payload,
        })),
      },
    },
  })

  if (error) {
    console.error('[Messages] Falha ao enviar quick replies', { recipientIgId, error })
    return null
  }

  return data
}

// ─── Botão CTA com link externo ───────────────────────────────────────────────
export async function sendCtaButton(
  recipientIgId: string,
  text: string,
  buttonTitle: string,
  url: string,
  accessToken?: string,
  senderIgId?: string
): Promise<MetaSendMessageResponse | null> {
  const { data, error } = await graphApi<MetaSendMessageResponse>(messagesEndpoint(senderIgId), {
    method: 'POST',
    accessToken,
    body: {
      recipient: { id: recipientIgId },
      message: {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'button',
            text,
            buttons: [
              {
                type: 'web_url',
                url,
                title: buttonTitle.slice(0, 20),
              },
            ],
          },
        },
      },
    },
  })

  if (error) {
    console.error('[Messages] Falha ao enviar CTA button', { recipientIgId, error })
    return null
  }

  return data
}

// ─── Comentário público em post (resposta ao comentário que disparou) ─────────
export async function replyToComment(
  commentId: string,
  message: string
): Promise<{ id: string } | null> {
  const { data, error } = await graphApi<{ id: string }>(
    `${commentId}/replies`,
    {
      method: 'POST',
      body: { message },
    }
  )

  if (error) {
    console.error('[Messages] Falha ao responder comentário', { commentId, error })
    return null
  }

  return data
}
// ─── Resposta privada via comentário (Private Reply) ───────────────────────
// Usa graph.instagram.com/me/messages com Instagram Token (IGAA).
// O 4o parametro (igAccessToken) é o token IGAA do banco ou env var.
export async function sendPrivateReply(
  commentId: string,
  text: string,
  _accessToken?: string,
  igAccessToken?: string
): Promise<MetaSendMessageResponse | null> {
  const igToken = igAccessToken ?? process.env.INSTAGRAM_DM_TOKEN
  if (!igToken) {
    console.error('[Messages] Instagram Token (IGAA) não disponível — configure ig_access_token na conta ou INSTAGRAM_DM_TOKEN no env')
    return null
  }

  const { data, error, status } = await graphApi<MetaSendMessageResponse>(
    'https://graph.instagram.com/v21.0/me/messages',
    {
      method: 'POST',
      body: {
        recipient: { comment_id: commentId },
        message: { text },
      },
      accessToken: igToken,
    }
  )

  if (error) {
    console.error('[Messages] Falha ao enviar resposta privada', { commentId, error, status })
    try {
      const { createServiceClient } = await import('@/lib/supabase/server')
      const supabase = createServiceClient()
      const tokenUsed = process.env.INSTAGRAM_DM_TOKEN ?? ''
      await supabase.from('webhook_events').insert({
        event_type: 'send_error',
        payload: {
          function: 'sendPrivateReply',
          commentId,
          igTokenUsed: !!igToken,
          error,
          status,
          endpoint: `${commentId}/private_replies`,
          tokenPrefix: tokenUsed.slice(0, 10),
          tokenLength: tokenUsed.length,
          textPreview: text.slice(0, 100),
        } as any,
        error: `sendPrivateReply failed: ${error}`,
      })
    } catch { /* não falhar por causa do log */ }
    return null
  }

  return data
}
