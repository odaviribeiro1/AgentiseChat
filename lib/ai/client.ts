import OpenAI from 'openai'
import { createServiceClient } from '@/lib/supabase/server'
import type { AiModel } from '@/lib/supabase/types'

let openaiClient: OpenAI | null = null

function getOpenAi(): OpenAI {
  if (openaiClient) return openaiClient
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY não configurada. Defina em Vercel → Settings → Environment Variables ' +
        '(ou em .env.local para desenvolvimento). Obtenha sua chave em https://platform.openai.com/api-keys.'
    )
  }
  openaiClient = new OpenAI({ apiKey })
  return openaiClient
}

/**
 * Roda um step de AI com o contexto dado.
 * Retorna null se der erro (ex: quota exceeded) para fallback para atendente.
 */
export async function runAiStep(
  accountId: string,
  model: AiModel,
  systemPrompt: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string | null> {
  const supabase = createServiceClient()

  try {
    const openai = getOpenAi()
    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
      ],
      max_tokens: 500,
      temperature: 0.7,
    })

    const content = response.choices[0]?.message?.content
    if (!content) return null

    // Registrar o uso
    const usage = response.usage
    if (usage) {
      try {
        await supabase.from('ai_usage').insert({
          account_id: accountId,
          model,
          prompt_tokens: usage.prompt_tokens,
          completion_tokens: usage.completion_tokens,
          total_tokens: usage.total_tokens,
        })
      } catch (err) {
        console.error('[AiClient] Falha ao logar ai_usage', err)
      }
    }

    return content

  } catch (error) {
    console.error('[AiClient] Falha ao chamar a OpenAI:', error)
    return null
  }
}
