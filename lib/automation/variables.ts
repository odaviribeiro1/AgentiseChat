import type { ContactRow } from '@/lib/supabase/types'

interface VariableContext {
  contact: Pick<ContactRow, 'full_name' | 'username'>
  postTitle?: string
}

/**
 * Substitui variáveis dinâmicas no texto de um step.
 * Suporta: {{first_name}}, {{username}}, {{post_title}}, {{current_date}}
 */
export function interpolateVariables(text: string, ctx: VariableContext): string {
  const firstName = ctx.contact.full_name?.split(' ')[0] ?? ctx.contact.username ?? ''
  const username  = ctx.contact.username ?? ''
  const postTitle = ctx.postTitle ?? ''
  const currentDate = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date())

  return text
    .replace(/\{\{first_name\}\}/gi, firstName)
    .replace(/\{\{username\}\}/gi, username)
    .replace(/\{\{post_title\}\}/gi, postTitle)
    .replace(/\{\{current_date\}\}/gi, currentDate)
}
