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
    await read('app/projects/[id]/actions.js'),
  ].join('\n')

  assert.match(files, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/)
  assert.doesNotMatch(files, /service_role|SUPABASE_SERVICE_ROLE_KEY|sb_secret_/i)
})

test('customer project writes remain gated until the security migration is approved', async () => {
  const requestAction = await read('app/request/actions.js')
  const workflowActions = await read('app/projects/[id]/actions.js')
  const env = await read('.env.example')

  assert.match(requestAction, /EVENTO_REQUEST_WRITE_MODE !== 'enabled'/)
  assert.match(workflowActions, /EVENTO_REQUEST_WRITE_MODE !== 'enabled'/)
  for (const action of [requestAction, workflowActions]) {
    assert.match(action, /getClaims\(\)/)
    assert.match(action, /is_anonymous === true/)
  }
  assert.match(env, /EVENTO_REQUEST_WRITE_MODE=disabled/)
})

test('commercial and contract acceptance use independent default-off kill switches', async () => {
  const actions = await read('app/projects/[id]/actions.js')
  const env = await read('.env.example')
  assert.match(actions, /EVENTO_COMMERCIAL_WRITE_MODE !== 'enabled'/)
  assert.match(actions, /accept_quote_version/)
  assert.match(env, /EVENTO_COMMERCIAL_WRITE_MODE=disabled/)
  assert.match(actions, /EVENTO_CONTRACT_WRITE_MODE !== 'enabled'/)
  assert.match(actions, /from\('contract_acceptances'\)/)
  assert.match(env, /EVENTO_CONTRACT_WRITE_MODE=disabled/)
})

test('scope review reuses the existing mobile-compatible RPC contract', async () => {
  const actions = await read('app/projects/[id]/actions.js')
  const detail = await read('app/projects/[id]/page.js')
  assert.match(actions, /start_project_workflow/)
  assert.match(actions, /approve_project_scope/)
  assert.match(detail, /request_analyses/)
  assert.match(detail, /project_workflows/)
  assert.match(detail, /project_request_events/)
})

test('security migration preserves mobile RPC names while rejecting anonymous accounts', async () => {
  const migration = await read('supabase/migrations/20260811_revenue_engine_security_hardening.sql')
  assert.match(migration, /start_project_workflow/i)
  assert.match(migration, /approve_project_scope/i)
  assert.match(migration, /is_anonymous/i)
  assert.doesNotMatch(migration, /drop function\s+public\.(start_project_workflow|approve_project_scope)/i)
})

test('quote schema keeps customer prices separate from internal economics', async () => {
  const migration = await read('supabase/migrations/20260811_quote_pricing_proposal_foundation.sql')
  assert.match(migration, /create table if not exists public\.quote_versions/i)
  assert.match(migration, /create table if not exists public\.quote_version_economics/i)
  assert.match(migration, /create table if not exists public\.pricing_rules/i)
  assert.match(migration, /grant select on public\.quote_versions to authenticated/i)
  assert.doesNotMatch(migration, /grant\s+(select|insert|update|delete|all).*quote_version_economics.*authenticated/i)
  assert.doesNotMatch(migration, /grant\s+(select|insert|update|delete|all).*pricing_rules.*authenticated/i)
})

test('quote ownership and current-version integrity are enforced by composite foreign keys', async () => {
  const migration = await read('supabase/migrations/20260811_quote_pricing_proposal_foundation.sql')
  assert.match(migration, /foreign key \(request_id, user_id\)[\s\S]*references public\.project_requests\(id, user_id\)/i)
  assert.match(migration, /foreign key \(current_version_id, id\)[\s\S]*references public\.quote_versions\(id, quote_id\)/i)
  assert.match(migration, /foreign key \(quote_version_id, quote_id, request_id, user_id\)[\s\S]*references public\.quote_versions\(id, quote_id, request_id, user_id\)/i)
})

test('customers cannot mutate quote prices and acceptance binds the exact current version', async () => {
  const migration = await read('supabase/migrations/20260811_quote_pricing_proposal_foundation.sql')
  assert.match(migration, /revoke all on public\.quote_versions from anon, authenticated/i)
  assert.match(migration, /grant select on public\.quote_versions to authenticated/i)
  assert.match(migration, /accept_quote_version/i)
  assert.match(migration, /quote_version_not_current/i)
  assert.match(migration, /quote_totals_invalid/i)
  assert.match(migration, /scope_not_approved/i)
  assert.match(migration, /quote_expired/i)
  assert.match(migration, /extensions\.digest\(v_quote_payload, 'sha256'\)/i)
})

test('customer quote UI never queries internal economics or pricing rules', async () => {
  const detail = await read('app/projects/[id]/page.js')
  assert.match(detail, /from\('quotes'\)/)
  assert.match(detail, /from\('quote_versions'\)/)
  assert.match(detail, /from\('quote_items'\)/)
  assert.doesNotMatch(detail, /quote_version_economics|pricing_rules|expected_variable_cost|gross_margin/i)
})

test('Gate 4 contract is bound to the exact accepted quote and current contract version', async () => {
  const migration = await read('supabase/migrations/20260811_terms_contract_approval_foundation.sql')
  assert.match(migration, /foreign key \(quote_version_id, quote_id, request_id, user_id\)[\s\S]*references public\.quote_versions\(id, quote_id, request_id, user_id\)/i)
  assert.match(migration, /foreign key \(current_version_id, id, request_id, user_id, quote_id, quote_version_id\)[\s\S]*references public\.contract_versions\(id, agreement_id, request_id, user_id, quote_id, quote_version_id\)/i)
  assert.match(migration, /contract_version_not_current/i)
  assert.match(migration, /accepted_quote_required/i)
  assert.match(migration, /quote_acceptance_evidence_required/i)
})

test('Gate 4 requires reviewed terms and immutable hash evidence', async () => {
  const migration = await read('supabase/migrations/20260811_terms_contract_approval_foundation.sql')
  assert.match(migration, /legal_review_status.*approved_for_use/is)
  assert.match(migration, /legal_review_required/i)
  assert.match(migration, /agreement_sha256/i)
  assert.match(migration, /extensions\.digest\(v_payload, 'sha256'\)/i)
  assert.match(migration, /unique \(agreement_id, user_id\)/i)
  assert.match(migration, /unique \(agreement_version_id, user_id\)/i)
})

test('Gate 4 elevated trigger functions stay private and are not customer RPCs', async () => {
  const migration = await read('supabase/migrations/20260811_terms_contract_approval_foundation.sql')
  assert.match(migration, /create schema if not exists private/i)
  assert.match(migration, /create or replace function private\.finalize_contract_acceptance\(\)/i)
  assert.match(migration, /create or replace function private\.after_contract_acceptance\(\)/i)
  assert.match(migration, /revoke all on function private\.finalize_contract_acceptance\(\) from public, anon, authenticated/i)
  assert.doesNotMatch(migration, /grant execute on function private\.(finalize_contract_acceptance|after_contract_acceptance).*authenticated/i)
  assert.doesNotMatch(migration, /create or replace function public\.accept_contract/i)
})

test('browser can insert only the contract version id, while authoritative acceptance fields remain database-owned', async () => {
  const migration = await read('supabase/migrations/20260811_terms_contract_approval_foundation.sql')
  assert.match(migration, /grant insert \(agreement_version_id\) on public\.contract_acceptances to authenticated/i)
  assert.doesNotMatch(migration, /grant insert on public\.contract_acceptances to authenticated/i)
  assert.match(migration, /new\.user_id := v_uid/i)
  assert.match(migration, /new\.quote_version_id := v_agreement\.quote_version_id/i)
  assert.match(migration, /new\.terms_version := v_version\.terms_version/i)
})

test('customer contract UI queries only customer-visible contract tables', async () => {
  const detail = await read('app/projects/[id]/page.js')
  assert.match(detail, /from\('contract_agreements'\)/)
  assert.match(detail, /from\('contract_versions'\)/)
  assert.match(detail, /from\('contract_acceptances'\)/)
  assert.doesNotMatch(detail, /from\('private\.|service_role|SUPABASE_SERVICE_ROLE_KEY/i)
})

test('THE ROOT does not re-enter EVENTO runtime source', async () => {
  const runtime = [
    await read('app/page.js'),
    await read('app/request/page.js'),
    await read('app/projects/[id]/page.js'),
    await read('package.json'),
  ].join('\n')
  assert.doesNotMatch(runtime, /THE ROOT|الجذر|ANTHROPIC_API_KEY|storyboard/i)
})
