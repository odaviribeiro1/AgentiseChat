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
