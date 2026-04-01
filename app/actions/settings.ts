'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function disconnectInstagram() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Não autorizado')

  const serviceClient = createServiceClient()

  // Buscar conta ativa do usuário
  const { data: account } = await serviceClient
    .from('accounts')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (account) {
    // Pausar todas as automações ativas
    await serviceClient
      .from('automations')
      .update({ status: 'paused' })
      .eq('account_id', account.id)
      .eq('status', 'active')

    // Desativar a conta e limpar o token
    await serviceClient
      .from('accounts')
      .update({ is_active: false, access_token: '' })
      .eq('id', account.id)
  }

  revalidatePath('/configuracoes')
  redirect('/conexao')
}
