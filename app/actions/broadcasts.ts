'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { BroadcastMessageConfig } from '@/lib/supabase/types'
import type { Json } from '@/lib/supabase/database.types'

export async function createBroadcast(formData: FormData) {
  const db = createServiceClient()

  const name       = formData.get('name') as string
  const tagsRaw    = formData.get('tags') as string
  const action     = formData.get('action') as string  // 'draft' | 'send'
  const messageType = formData.get('message_type') as 'text' | 'image' | 'cta_button'
  const accountId  = formData.get('account_id') as string

  const segment_tags = tagsRaw
    ? tagsRaw.split(',').map((s) => s.trim()).filter(Boolean)
    : []

  let message_config: BroadcastMessageConfig

  if (messageType === 'image') {
    message_config = {
      type: 'image',
      text: (formData.get('caption') as string) || '',
      image_url: formData.get('image_url') as string,
    }
  } else if (messageType === 'cta_button') {
    message_config = {
      type: 'cta_button',
      text: formData.get('text') as string,
      button: {
        title: formData.get('button_title') as string,
        url: formData.get('button_url') as string,
      },
    }
  } else {
    message_config = {
      type: 'text',
      text: formData.get('text') as string,
    }
  }

  const { data, error } = await db
    .from('broadcasts')
    .insert({
      account_id: accountId,
      name,
      status: action === 'send' ? 'scheduled' : 'draft',
      segment_tags,
      message_config: message_config as unknown as Json,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[Broadcast] Falha ao criar:', error)
    throw new Error('Falha ao criar disparo')
  }

  if (action === 'send' && data?.id) {
    const appUrl =
      process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    fetch(`${appUrl}/api/broadcast/trigger?id=${data.id}`).catch(() => {})
  }

  revalidatePath('/broadcast')
  redirect('/broadcast')
}

export async function cancelBroadcast(broadcastId: string) {
  const db = createServiceClient()
  const { error } = await db
    .from('broadcasts')
    .update({ status: 'cancelled' })
    .eq('id', broadcastId)
    .in('status', ['draft', 'scheduled'])

  if (error) {
    console.error('[Broadcast] Falha ao cancelar:', error)
    throw new Error('Falha ao cancelar broadcast')
  }

  revalidatePath('/broadcast')
}

export async function deleteBroadcast(broadcastId: string) {
  const db = createServiceClient()
  const { error } = await db
    .from('broadcasts')
    .delete()
    .eq('id', broadcastId)
    .in('status', ['draft', 'cancelled'])

  if (error) {
    console.error('[Broadcast] Falha ao excluir:', error)
    throw new Error('Falha ao excluir broadcast')
  }

  revalidatePath('/broadcast')
}

export async function countEligibleContacts(accountId: string, tags?: string[]): Promise<number> {
  const db = createServiceClient()
  let query = db
    .from('contacts')
    .select('*', { count: 'exact', head: true })
    .eq('account_id', accountId)
    .gt('window_expires_at', new Date().toISOString())
    .eq('opted_out', false)
    .eq('is_blocked', false)

  if (tags && tags.length > 0) {
    query = query.contains('tags', tags)
  }

  const { count } = await query
  return count ?? 0
}
