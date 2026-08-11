import { NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase/server'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const tokenHash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')
  const requestedNext = requestUrl.searchParams.get('next') || '/dashboard'
  const safeNext = requestedNext.startsWith('/') && !requestedNext.startsWith('//') ? requestedNext : '/dashboard'

  if (!tokenHash || !type) {
    return NextResponse.redirect(new URL('/login?error=confirmation_failed', requestUrl.origin))
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })

  if (error) {
    return NextResponse.redirect(new URL('/login?error=confirmation_failed', requestUrl.origin))
  }

  return NextResponse.redirect(new URL(safeNext, requestUrl.origin))
}
