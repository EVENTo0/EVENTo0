export async function GET() {
  const body = {
    service: 'EVENTO Revenue Engine',
    phase: 'recovery-foundation',
    supabaseConfigured: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
    requestWritesEnabled: process.env.EVENTO_REQUEST_WRITE_MODE === 'enabled',
    commit: process.env.VERCEL_GIT_COMMIT_SHA || null,
  }

  return Response.json(body, {
    status: 200,
    headers: { 'cache-control': 'no-store' },
  })
}
