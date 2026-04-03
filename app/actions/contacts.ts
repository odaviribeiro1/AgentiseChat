'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function blockContact(contactId: string) {
  const db = createServiceClient()
  await db.from('contacts').update({ is_blocked: true }).eq('id', contactId)
  revalidatePath(`/contatos/${contactId}`)
  revalidatePath('/contatos')
}

export async function unblockContact(contactId: string) {
  const db = createServiceClient()
  await db.from('contacts').update({ is_blocked: false }).eq('id', contactId)
  revalidatePath(`/contatos/${contactId}`)
  revalidatePath('/contatos')
}

export async function optOutContact(contactId: string) {
  const db = createServiceClient()
  await db.from('contacts').update({ opted_out: true }).eq('id', contactId)
  revalidatePath(`/contatos/${contactId}`)
  revalidatePath('/contatos')
}

export async function addTag(contactId: string, tag: string) {
  const db = createServiceClient()
  const { data } = await db.from('contacts').select('tags').eq('id', contactId).single()
  const currentTags: string[] = (data?.tags as string[]) ?? []
  if (!currentTags.includes(tag)) {
    await db.from('contacts').update({ tags: [...currentTags, tag] }).eq('id', contactId)
  }
  revalidatePath(`/contatos/${contactId}`)
  revalidatePath('/contatos')
}

export async function removeTag(contactId: string, tag: string) {
  const db = createServiceClient()
  const { data } = await db.from('contacts').select('tags').eq('id', contactId).single()
  const currentTags: string[] = (data?.tags as string[]) ?? []
  await db.from('contacts').update({ tags: currentTags.filter(t => t !== tag) }).eq('id', contactId)
  revalidatePath(`/contatos/${contactId}`)
  revalidatePath('/contatos')
}
