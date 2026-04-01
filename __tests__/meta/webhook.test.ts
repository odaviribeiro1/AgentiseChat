import crypto from 'crypto'
import { verifyWebhookSignature, parseWebhookPayload } from '@/lib/meta/webhook'
import type { MetaWebhookPayload } from '@/lib/meta/types'

const TEST_SECRET = 'test_secret'

// ─── verifyWebhookSignature ───────────────────────────────────────────────────
describe('verifyWebhookSignature', () => {
  function makeSignature(body: string, secret = TEST_SECRET) {
    const hash = crypto
      .createHmac('sha256', secret)
      .update(body, 'utf8')
      .digest('hex')
    return `sha256=${hash}`
  }

  it('retorna true para assinatura válida', () => {
    const body = JSON.stringify({ test: 'payload' })
    const sig = makeSignature(body)
    expect(verifyWebhookSignature(body, sig)).toBe(true)
  })

  it('retorna false para assinatura inválida', () => {
    const body = JSON.stringify({ test: 'payload' })
    expect(verifyWebhookSignature(body, 'sha256=invalida00000000000000000000000000000000000000000000000000000000000000')).toBe(false)
  })

  it('retorna false se header for null', () => {
    expect(verifyWebhookSignature('body', null)).toBe(false)
  })

  it('retorna false se o body foi adulterado', () => {
    const body = JSON.stringify({ test: 'payload' })
    const sig = makeSignature(body)
    const tamperedBody = JSON.stringify({ test: 'adulterado' })
    expect(verifyWebhookSignature(tamperedBody, sig)).toBe(false)
  })
})

// ─── parseWebhookPayload ──────────────────────────────────────────────────────
describe('parseWebhookPayload', () => {
  function basePayload(overrides: Partial<MetaWebhookPayload>): MetaWebhookPayload {
    return {
      object: 'instagram',
      entry: [],
      ...overrides,
    }
  }

  it('parseia evento de comentário corretamente', () => {
    const payload = basePayload({
      entry: [{
        id: 'account_123',
        time: 1700000000,
        changes: [{
          field: 'comments',
          value: {
            id: 'comment_456',
            text: 'EBOOK',
            from: { id: 'user_789' },
            media: { id: 'post_abc', media_product_type: 'REEL' },
            timestamp: 1700000000,
          },
        }],
      }],
    })

    const events = parseWebhookPayload(payload)
    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('comment')
    expect(events[0].comment?.text).toBe('EBOOK')
    expect(events[0].comment?.postId).toBe('post_abc')
    expect(events[0].senderIgId).toBe('user_789')
    expect(events[0].accountIgId).toBe('account_123')
  })

  it('parseia evento de DM de texto', () => {
    const payload = basePayload({
      entry: [{
        id: 'account_123',
        time: 1700000000,
        messaging: [{
          sender: { id: 'user_789' },
          recipient: { id: 'account_123' },
          timestamp: 1700000000,
          message: { mid: 'msg_001', text: 'Olá!' },
        }],
      }],
    })

    const events = parseWebhookPayload(payload)
    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('dm_text')
    expect(events[0].message?.text).toBe('Olá!')
    expect(events[0].message?.isStoryReply).toBe(false)
  })

  it('parseia evento de Quick Reply', () => {
    const payload = basePayload({
      entry: [{
        id: 'account_123',
        time: 1700000000,
        messaging: [{
          sender: { id: 'user_789' },
          recipient: { id: 'account_123' },
          timestamp: 1700000000,
          message: {
            mid: 'msg_002',
            text: 'Quero!',
            quick_reply: { payload: 'WANT' },
          },
        }],
      }],
    })

    const events = parseWebhookPayload(payload)
    expect(events[0].type).toBe('dm_quick_reply')
    expect(events[0].message?.quickReplyPayload).toBe('WANT')
  })

  it('parseia evento de story reply', () => {
    const payload = basePayload({
      entry: [{
        id: 'account_123',
        time: 1700000000,
        messaging: [{
          sender: { id: 'user_789' },
          recipient: { id: 'account_123' },
          timestamp: 1700000000,
          message: {
            mid: 'msg_003',
            text: 'Adorei!',
            reply_to: { story: { id: 'story_001', url: 'https://example.com/story' } },
          },
        }],
      }],
    })

    const events = parseWebhookPayload(payload)
    expect(events[0].type).toBe('dm_story_reply')
    expect(events[0].message?.isStoryReply).toBe(true)
  })

  it('parseia evento de leitura (dm_read)', () => {
    const payload = basePayload({
      entry: [{
        id: 'account_123',
        time: 1700000000,
        messaging: [{
          sender: { id: 'user_789' },
          recipient: { id: 'account_123' },
          timestamp: 1700000000,
          read: { watermark: 1700000000 },
        }],
      }],
    })

    const events = parseWebhookPayload(payload)
    expect(events[0].type).toBe('dm_read')
  })

  it('retorna array vazio para payload sem events relevantes', () => {
    const events = parseWebhookPayload(basePayload({ entry: [] }))
    expect(events).toHaveLength(0)
  })

  it('parseia múltiplos eventos em um único payload', () => {
    const payload = basePayload({
      entry: [{
        id: 'account_123',
        time: 1700000000,
        messaging: [
          {
            sender: { id: 'user_001' },
            recipient: { id: 'account_123' },
            timestamp: 1700000000,
            message: { mid: 'msg_a', text: 'Oi' },
          },
          {
            sender: { id: 'user_002' },
            recipient: { id: 'account_123' },
            timestamp: 1700000001,
            message: { mid: 'msg_b', text: 'Olá' },
          },
        ],
      }],
    })

    const events = parseWebhookPayload(payload)
    expect(events).toHaveLength(2)
    expect(events[0].senderIgId).toBe('user_001')
    expect(events[1].senderIgId).toBe('user_002')
  })
})
