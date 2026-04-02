import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getRecentComments } from '@/lib/meta/instagram'
import { processAutomationEvent } from '@/lib/automation/engine'
import { decryptToken } from '@/lib/crypto/tokens'
import type { NormalizedWebhookEvent, MetaWebhookPayload } from '@/lib/meta/types'
import type { TriggerConfig } from '@/lib/supabase/types'

/**
 * GET /api/cron/poll-comments
 *
 * Polling de comentários como alternativa a webhooks.
 * Busca comentários recentes nos posts com automações ativas,
 * filtra os já processados e dispara o engine de automação.
 *
 * Recomendado: rodar a cada 1-2 minutos via Vercel Cron ou serviço externo.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // 1. Buscar contas ativas
  const { data: accounts, error: accError } = await supabase
    .from('accounts')
    .select('*')
    .eq('is_active', true)

  if (accError || !accounts?.length) {
    return NextResponse.json({ error: 'Nenhuma conta ativa', detail: accError?.message }, { status: 200 })
  }

  let totalProcessed = 0
  let totalTriggered = 0
  let totalErrors = 0

  for (const account of accounts) {
    try {
      // 2. Buscar automações ativas de comentário para esta conta
      const { data: automations } = await supabase
        .from('automations')
        .select('*')
        .eq('account_id', account.id)
        .eq('status', 'active')
        .eq('trigger_type', 'comment_keyword')

      if (!automations?.length) continue

      const plainToken = decryptToken(account.access_token)

      // 3. Coletar todos os post_ids únicos das automações
      const postIds = new Set<string>()
      for (const auto of automations) {
        const config = auto.trigger_config as unknown as TriggerConfig
        if (config.apply_to === 'specific_post' && config.post_id) {
          postIds.add(config.post_id)
        }
        // Para 'all_posts', buscamos os posts recentes da conta (abaixo)
      }

      const hasAllPostsAutomation = automations.some(a => {
        const c = a.trigger_config as unknown as TriggerConfig
        return c.apply_to === 'all_posts'
      })

      // Se alguma automação é para all_posts, buscar posts recentes
      if (hasAllPostsAutomation) {
        const { getInstagramPosts } = await import('@/lib/meta/instagram')
        const { posts } = await getInstagramPosts(account.instagram_user_id, plainToken, 10)
        for (const post of posts) {
          postIds.add(post.id)
        }
      }

      if (postIds.size === 0) continue

      // 4. Para cada post, buscar comentários recentes
      for (const postId of postIds) {
        try {
          const comments = await getRecentComments(postId, plainToken, 50)
          if (!comments.length) continue

          // 5. Filtrar comentários já processados
          const commentIds = comments.map(c => c.id)
          const { data: existingRuns } = await supabase
            .from('webhook_events')
            .select('instagram_user_id')
            .eq('event_type', 'poll_processed')
            .in('instagram_user_id', commentIds)

          const processedIds = new Set(
            existingRuns?.map(r => r.instagram_user_id) ?? []
          )

          const newComments = comments.filter(c => !processedIds.has(c.id))
          if (!newComments.length) continue

          // 6. Processar cada comentário novo
          for (const comment of newComments) {
            // Ignorar comentários do próprio dono da conta
            if (comment.from.id === account.instagram_user_id) continue

            totalProcessed++

            // Montar evento normalizado (mesmo formato do webhook)
            const event: NormalizedWebhookEvent = {
              type: 'comment',
              accountIgId: account.instagram_user_id,
              senderIgId: comment.from.id,
              timestamp: new Date(comment.timestamp),
              raw: {} as MetaWebhookPayload, // polling não tem payload bruto
              comment: {
                id: comment.id,
                text: comment.text,
                postId: postId,
              },
            }

            try {
              await processAutomationEvent(event)
              totalTriggered++
            } catch (err) {
              console.error('[Cron/PollComments] Erro ao processar comentário', {
                commentId: comment.id,
                error: err instanceof Error ? err.message : err,
              })
              totalErrors++
            }

            // Marcar como processado (evitar reprocessamento)
            await supabase.from('webhook_events').insert({
              event_type: 'poll_processed',
              instagram_user_id: comment.id,
              payload: {
                commentId: comment.id,
                postId,
                senderIgId: comment.from.id,
                text: comment.text,
              } as any,
              processed: true,
              processed_at: new Date().toISOString(),
            })
          }
        } catch (err) {
          console.error('[Cron/PollComments] Erro ao buscar comentários do post', {
            postId,
            error: err instanceof Error ? err.message : err,
          })
          totalErrors++
        }
      }
    } catch (err) {
      console.error('[Cron/PollComments] Erro ao processar conta', {
        accountId: account.id,
        error: err instanceof Error ? err.message : err,
      })
      totalErrors++
    }
  }

  console.log(`[Cron/PollComments] ${totalProcessed} comentários, ${totalTriggered} automações, ${totalErrors} erros`)
  return NextResponse.json({ processed: totalProcessed, triggered: totalTriggered, errors: totalErrors })
}
