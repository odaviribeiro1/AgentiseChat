import { createServiceClient } from '@/lib/supabase/server'

/**
 * Busca o histórico recente de mensagens do contato para enviar como contexto ao LLM.
 */
export async function buildConversationContext(
  contactId: string,
  limit: number = 5
): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
  const supabase = createServiceClient()

  // Buscar as últimas 'limit' mensagens
  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('contact_id', contactId)
    .order('sent_at', { ascending: false })
    .limit(limit)

  if (!messages?.length) {
    return []
  }

  // Ordenar de volta para ordem cronológica ascendente
  const history = messages.reverse().map(msg => {
    // Config de mensagem tem um campo "text"
    const textContent = typeof msg.content === 'object' && msg.content !== null && 'text' in msg.content
      ? (msg.content as any).text
      : typeof msg.content === 'string' 
        ? msg.content 
        : '[Mensagem multimídia ou não suportada]'

    return {
      role: msg.direction === 'inbound' ? 'user' : 'assistant',
      content: textContent,
    } as { role: 'user' | 'assistant'; content: string }
  })

  return history
}
