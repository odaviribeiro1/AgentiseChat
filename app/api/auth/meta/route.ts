import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildOAuthUrl } from '@/lib/meta/oauth'
import crypto from 'crypto'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Gerar state CSRF — armazenar em cookie httpOnly para verificar no callback
  const state = crypto.randomBytes(16).toString('hex')

  const response = NextResponse.redirect(buildOAuthUrl(state))
  response.cookies.set('meta_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,                    // 10 minutos
    path: '/',
  })

  return response
}
