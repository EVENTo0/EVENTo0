import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

const migrations = {
  security: 'supabase/migrations/20260811120000_revenue_engine_security_hardening.sql',
  quote: 'supabase/migrations/20260811121000_quote_pricing_proposal_foundation.sql',
  contract: 'supabase/migrations/20260811122000_terms_contract_approval_foundation.sql',
  payment: 'supabase/migrations/20260811123000_verified_payment_ledger_foundation.sql',
}

test('runtime is pinned to Node 24 and explicit Next.js Vercel framework', async () => {
  const pkg = JSON.parse(await read('package.json'))
  const vercel = JSON.parse(await read('vercel.json'))
  assert.match(pkg.engines.node, /^>=24/)
  assert.equal(vercel.framework, 'nextjs')
})

test('Supabase browser/server clients use publishable configuration only', async () => {
  const files = [
    await read('lib/supabase/client.js'),
    await read('lib/supabase/server.js'),
    await read('lib/supabase/proxy.js'),
    await read('app/request/actions.js'),
    await read('app/projects/[id]/actions.js'),
  ].join('\n')
  assert.match(files, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/)
  assert.doesNotMatch(files, /service_role|SUPABASE_SERVICE_ROLE_KEY|sb_secret_|sk_live_|rk_live_/i)
})

test('all business write gates remain independent and default off', async () => {
  const env = await read('.env.example')
  for (const gate of [
    'EVENTO_REQUEST_WRITE_MODE=disabled',
    'EVENTO_COMMERCIAL_WRITE_MODE=disabled',
    'EVENTO_CONTRACT_WRITE_MODE=disabled',
    'EVENTO_PAYMENT_WRITE_MODE=disabled',
    'EVENTO_FULFILLMENT_WRITE_MODE=disabled',
  ]) assert.match(env, new RegExp(gate))

  const requestAction = await read('app/request/actions.js')
  const projectActions = await read('app/projects/[id]/actions.js')
  assert.match(requestAction, /EVENTO_REQUEST_WRITE_MODE !== 'enabled'/)
  assert.match(projectActions, /EVENTO_COMMERCIAL_WRITE_MODE !== 'enabled'/)
  assert.match(projectActions, /EVENTO_CONTRACT_WRITE_MODE !== 'enabled'/)
  assert.match(projectActions, /getClaims\(\)/)
  assert.match(projectActions, /is_anonymous === true/)
})

test('Gate 2 preserves EVENTO Mobile-compatible scope RPC names', async () => {
  const actions = await read('app/projects/[id]/actions.js')
  const detail = await read('app/projects/[id]/page.js')
  assert.match(actions, /start_project_workflow/)
  assert.match(actions, /approve_project_scope/)
  assert.match(detail, /request_analyses/)
  assert.match(detail, /project_workflows/)
  assert.match(detail, /project_request_events/)
})

test('security hardening preserves RPC contract while rejecting anonymous users', async () => {
  const sql = await read(migrations.security)
  assert.match(sql, /start_project_workflow/i)
  assert.match(sql, /approve_project_scope/i)
  assert.match(sql, /is_anonymous/i)
  assert.doesNotMatch(sql, /drop function\s+public\.(start_project_workflow|approve_project_scope)/i)
})

test('Gate 3 separates customer quote data from EVENTO economics', async () => {
  const sql = await read(migrations.quote)
  assert.match(sql, /create table if not exists public\.quote_versions/i)
  assert.match(sql, /create table if not exists public\.quote_version_economics/i)
  assert.match(sql, /create table if not exists public\.pricing_rules/i)
  assert.match(sql, /grant select on public\.quote_versions to authenticated/i)
  assert.doesNotMatch(sql, /grant\s+(select|insert|update|delete|all).*quote_version_economics.*authenticated/i)
  assert.doesNotMatch(sql, /grant\s+(select|insert|update|delete|all).*pricing_rules.*authenticated/i)
})

test('Gate 3 binds quote ownership and current version with composite foreign keys', async () => {
  const sql = await read(migrations.quote)
  assert.match(sql, /foreign key \(request_id, user_id\)[\s\S]*references public\.project_requests\(id, user_id\)/i)
  assert.match(sql, /foreign key \(current_version_id, id\)[\s\S]*references public\.quote_versions\(id, quote_id\)/i)
  assert.match(sql, /foreign key \(quote_version_id, quote_id, request_id, user_id\)[\s\S]*references public\.quote_versions\(id, quote_id, request_id, user_id\)/i)
})

test('Gate 3 customer acceptance binds exact current non-expired scope-approved quote', async () => {
  const sql = await read(migrations.quote)
  assert.match(sql, /accept_quote_version/i)
  assert.match(sql, /quote_version_not_current/i)
  assert.match(sql, /quote_totals_invalid/i)
  assert.match(sql, /scope_not_approved/i)
  assert.match(sql, /quote_expired/i)
  assert.match(sql, /extensions\.digest\(v_quote_payload, 'sha256'\)/i)
})

test('customer quote UI never queries internal economics', async () => {
  const detail = await read('app/projects/[id]/page.js')
  assert.match(detail, /from\('quotes'\)/)
  assert.match(detail, /from\('quote_versions'\)/)
  assert.match(detail, /from\('quote_items'\)/)
  assert.doesNotMatch(detail, /quote_version_economics|pricing_rules|expected_variable_cost|gross_margin/i)
})

test('Gate 4 contract is bound to the accepted quote and exact current contract version', async () => {
  const sql = await read(migrations.contract)
  assert.match(sql, /references public\.quote_versions/i)
  assert.match(sql, /references public\.contract_versions/i)
  assert.match(sql, /contract_version_not_current/i)
  assert.match(sql, /accepted_quote_required/i)
  assert.match(sql, /quote_acceptance_evidence_required/i)
})

test('Gate 4 requires legal review and immutable contract hash evidence', async () => {
  const sql = await read(migrations.contract)
  assert.match(sql, /legal_review_status.*approved_for_use/is)
  assert.match(sql, /legal_review_required/i)
  assert.match(sql, /agreement_sha256/i)
  assert.match(sql, /extensions\.digest\(v_payload, 'sha256'\)/i)
  assert.match(sql, /unique \(agreement_version_id, user_id\)/i)
})

test('Gate 4 elevated acceptance helpers stay private', async () => {
  const sql = await read(migrations.contract)
  assert.match(sql, /create schema if not exists private/i)
  assert.match(sql, /private\.finalize_contract_acceptance\(\)/i)
  assert.match(sql, /private\.after_contract_acceptance\(\)/i)
  assert.match(sql, /revoke all on function private\.finalize_contract_acceptance\(\) from public, anon, authenticated/i)
  assert.doesNotMatch(sql, /grant execute on function private\.(finalize_contract_acceptance|after_contract_acceptance).*authenticated/i)
})

test('browser submits only contract version id while authoritative fields are database-owned', async () => {
  const sql = await read(migrations.contract)
  assert.match(sql, /grant insert \(agreement_version_id\) on public\.contract_acceptances to authenticated/i)
  assert.doesNotMatch(sql, /grant insert on public\.contract_acceptances to authenticated/i)
  assert.match(sql, /new\.user_id := v_uid/i)
  assert.match(sql, /new\.quote_version_id := v_agreement\.quote_version_id/i)
  assert.match(sql, /new\.terms_version := v_version\.terms_version/i)
})

test('Gate 5 payment order binds exact accepted contract evidence', async () => {
  const sql = await read(migrations.payment)
  assert.match(sql, /contract_acceptances_binding_unique/i)
  assert.match(sql, /references public\.contract_acceptances/i)
  assert.match(sql, /accepted_contract_required/i)
})

test('Gate 5 browser roles cannot create or mutate payment truth', async () => {
  const sql = await read(migrations.payment)
  for (const table of ['payment_orders','payment_attempts','payment_provider_attempt_details','payment_events','refunds','payment_provider_refund_details']) {
    assert.match(sql, new RegExp(`revoke all on public\\.${table} from anon, authenticated`, 'i'))
  }
  assert.match(sql, /grant select on public\.payment_orders to authenticated/i)
  assert.match(sql, /grant select on public\.payment_attempts to authenticated/i)
  assert.match(sql, /grant select on public\.refunds to authenticated/i)
  assert.doesNotMatch(sql, /grant\s+(insert|update|delete|all)\s+on public\.(payment_orders|payment_attempts|payment_events|refunds).*authenticated/i)
})

test('Gate 5 provider internals and webhook evidence stay customer-invisible', async () => {
  const sql = await read(migrations.payment)
  assert.match(sql, /create table if not exists public\.payment_provider_attempt_details/i)
  assert.match(sql, /create table if not exists public\.payment_events/i)
  assert.doesNotMatch(sql, /grant\s+select\s+on public\.(payment_provider_attempt_details|payment_events|payment_provider_refund_details)\s+to authenticated/i)
})

test('Gate 5 only verified provider events may move financial state', async () => {
  const sql = await read(migrations.payment)
  assert.match(sql, /unique \(provider, provider_event_id\)/i)
  assert.match(sql, /if new\.signature_verified is not true then[\s\S]*return new/i)
  assert.match(sql, /amount_mismatch/i)
  assert.match(sql, /currency_mismatch/i)
  assert.match(sql, /provider_mismatch/i)
  assert.match(sql, /refund_exceeds_paid_amount/i)
  assert.match(sql, /set status = 'paid'/i)
  assert.match(sql, /private\.apply_verified_payment_event\(\)/i)
})

test('customer payment UI is read-only and never queries provider internals', async () => {
  const page = await read('app/projects/[id]/payment/page.js')
  assert.match(page, /from\('payment_orders'\)/)
  assert.match(page, /from\('payment_attempts'\)/)
  assert.match(page, /from\('refunds'\)/)
  assert.match(page, /type="button" disabled/)
  assert.doesNotMatch(page, /payment_events|payment_provider_attempt_details|provider_session_id|idempotency_key|service_role|sk_live_|rk_live_|whsec_/i)
})

test('THE ROOT never re-enters EVENTO runtime source', async () => {
  const runtime = [
    await read('app/page.js'),
    await read('app/request/page.js'),
    await read('app/projects/[id]/page.js'),
    await read('app/projects/[id]/payment/page.js'),
    await read('app/projects/[id]/workspace/page.js'),
    await read('package.json'),
  ].join('\n')
  assert.doesNotMatch(runtime, /THE ROOT|الجذر|ANTHROPIC_API_KEY|storyboard/i)
})
