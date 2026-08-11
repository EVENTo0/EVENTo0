import { updateSession } from './lib/supabase/proxy'

export async function proxy(request) {
  return updateSession(request)
}

export const config = {
  matcher: ['/request/:path*', '/dashboard/:path*', '/login/:path*', '/auth/:path*'],
}
