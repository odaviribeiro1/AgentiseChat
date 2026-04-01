import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { graphApi } from '@/lib/meta/client'
import { decryptToken } from '@/lib/crypto/tokens'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ valid: false }, { status: 401 })
  }

  const { data: account } = await supabase
    .from('accounts')
    .select('instagram_user_id, access_token, token_expires_at')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!account) {
    return NextResponse.json({ valid: false })
  }

  const plainToken = decryptToken(account.access_token)

  // Validate using the IG-specific endpoint (not me/fields=id which fails for IG Business tokens)
  const { data, error } = await graphApi<{ id: string }>(
    `${account.instagram_user_id}?fields=id`,
    { accessToken: plainToken }
  )

  const valid = !error && !!data?.id

  return NextResponse.json({
    valid,
    token_expires_at: account.token_expires_at,
    error: valid ? null : error,
  })
}
