'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/** Remove uma tag de todos os contatos da conta */
export async function deleteTag(accountId: string, tag: string) {
  const db = createServiceClient()
  const { data: contacts } = await db
    .from('contacts')
    .select('id, tags')
    .eq('account_id', accountId)
    .contains('tags', [tag])

  for (const contact of contacts ?? []) {
    const newTags = ((contact.tags as string[]) ?? []).filter(t => t !== tag)
    await db.from('contacts').update({ tags: newTags }).eq('id', contact.id)
  }

  revalidatePath('/tags')
  revalidatePath('/contatos')
}

/** Renomeia uma tag em todos os contatos da conta */
export async function renameTag(accountId: string, oldTag: string, newTag: string) {
  const db = createServiceClient()
  const { data: contacts } = await db
    .from('contacts')
    .select('id, tags')
    .eq('account_id', accountId)
    .contains('tags', [oldTag])

  for (const contact of contacts ?? []) {
    const tags = (contact.tags as string[]) ?? []
    const newTags = tags.map(t => t === oldTag ? newTag : t)
    // Deduplicate in case newTag already existed
    await db.from('contacts').update({ tags: [...new Set(newTags)] }).eq('id', contact.id)
  }

  revalidatePath('/tags')
  revalidatePath('/contatos')
}
