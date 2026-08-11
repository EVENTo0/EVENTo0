import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('runtime is current LTS and Vercel is explicitly Next.js', async () => {
  const pkg = JSON.parse(await read('package.json'))
  const vercel = JSON.parse(await read('vercel.json'))
  assert.match(pkg.engines.node, /^>=24/)
  assert.equal(vercel.framework, 'nextjs')
})

test('Supabase web clients use only public runtime configuration', async () => {
  const files = [
    await read('lib/supabase/client.js'),
    await read('lib/supabase/server.js'),
    await read('lib/supabase/proxy.js'),
    await read('app/request/actions.js'),
  ].join('\n')

  assert.match(files, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/)
  assert.doesNotMatch(files, /service_role|SUPABASE_SERVICE_ROLE_KEY|sb_secret_/i)
})

test('project writes remain gated until the security migration is approved', async () => {
  const action = await read('app/request/actions.js')
  const env = await read('.env.example')
  assert.match(action, /EVENTO_REQUEST_WRITE_MODE !== 'enabled'/)
  assert.match(env, /EVENTO_REQUEST_WRITE_MODE=disabled/)
  assert.match(action, /getClaims\(\)/)
  assert.match(action, /is_anonymous === true/)
})

test('security migration preserves mobile RPC names while rejecting anonymous accounts', async () => {
  const migration = await read('supabase/migrations/20260811_revenue_engine_security_hardening.sql')
  assert.match(migration, /start_project_workflow/i)
  assert.match(migration, /approve_project_scope/i)
  assert.match(migration, /is_anonymous/i)
  assert.doesNotMatch(migration, /drop function\s+public\.(start_project_workflow|approve_project_scope)/i)
})

test('THE ROOT does not re-enter EVENTO runtime source', async () => {
  const runtime = [
    await read('app/page.js'),
    await read('app/request/page.js'),
    await read('package.json'),
  ].join('\n')
  assert.doesNotMatch(runtime, /THE ROOT|الجذر|ANTHROPIC_API_KEY|storyboard/i)
})
