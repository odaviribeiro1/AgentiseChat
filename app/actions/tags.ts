'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/** Cria uma tag no registro da conta (sem atribuir a contatos) */
export async function createTag(accountId: string, name: string) {
  const trimmed = name.trim().toLowerCase()
  if (!trimmed) return { error: 'Nome da tag não pode estar vazio' }

  const db = createServiceClient()
  const { error } = await db
    .from('account_tags')
    .insert({ account_id: accountId, name: trimmed })

  if (error?.code === '23505') {
    return { error: 'Essa tag já existe' }
  }
  if (error) {
    return { error: 'Erro ao criar tag' }
  }

  revalidatePath('/tags')
  return { success: true }
}

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

  // Remover do registro de tags
  await db.from('account_tags').delete().eq('account_id', accountId).eq('name', tag)

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

  // Atualizar no registro de tags
  await db.from('account_tags').update({ name: newTag }).eq('account_id', accountId).eq('name', oldTag)

  revalidatePath('/tags')
  revalidatePath('/contatos')
}
