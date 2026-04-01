import OpenAI from 'openai'
import { createServiceClient } from '@/lib/supabase/server'
import type { AiModel } from '@/lib/supabase/types'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

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
