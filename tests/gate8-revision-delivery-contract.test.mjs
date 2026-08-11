import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')
const foundation = 'supabase/review/gate8_revision_delivery_foundation.sql'
const hardening = 'supabase/review/gate8_revision_delivery_hardening.sql'

test('Gate 8 remains review-only until live schema reconciliation', async () => {
  const sql = await read(foundation)
  const drift = await read('docs/LIVE_SCHEMA_RECONCILIATION_2026-08-12.md')
  assert.match(sql, /REVIEW CANDIDATE ONLY/i)
  assert.match(sql, /intentionally NOT in supabase\/migrations/i)
  assert.match(sql, /supabase migration new/i)
  assert.match(drift, /project_quotes/)
  assert.match(drift, /project_payments/)
  assert.match(drift, /project_build_queue/)
  assert.match(drift, /Do \*\*not\*\* apply the recovery branch Gate 3–8 SQL directly to Production/i)
})

test('revision and delivery acceptance gates are independent and default off', async () => {
  const env = await read('.env.example')
  assert.match(env, /EVENTO_REVISION_WRITE_MODE=disabled/)
  assert.match(env, /EVENTO_DELIVERY_ACCEPTANCE_WRITE_MODE=disabled/)
})

test('revision cases derive from exact Preview feedback and customers cannot self classify', async () => {
  const sql = await read(foundation)
  assert.match(sql, /create table if not exists public\.project_revision_cases/i)
  assert.match(sql, /foreign key \(preview_feedback_id, preview_release_id, customer_project_id, request_id, user_id\)[\s\S]*references public\.project_preview_feedback/i)
  assert.match(sql, /disposition public\.evento_revision_disposition/i)
  assert.match(sql, /revoke all on public\.project_revision_cases from anon, authenticated/i)
  assert.match(sql, /grant select on public\.project_revision_cases to authenticated/i)
  assert.doesNotMatch(sql, /grant\s+(insert|update|delete|all).*project_revision_cases.*authenticated/i)
})

test('included revision entitlement is operator controlled and cannot exceed the snapshot limit', async () => {
  const sql = await read(hardening)
  assert.match(sql, /create or replace function private\.enforce_revision_case_decision\(\)/i)
  assert.match(sql, /active_evento_reviewer_required/i)
  assert.match(sql, /active_evento_operator_required/i)
  assert.match(sql, /included_revision_entitlement_exhausted/i)
  assert.match(sql, /included_revisions_used = included_revisions_used \+ 1/i)
  assert.match(sql, /counted_revision_cannot_be_silently_unconsumed/i)
  assert.match(sql, /revoke all on function private\.enforce_revision_case_decision\(\) from public, anon, authenticated/i)
})

test('change orders reference existing quote/payment layers instead of inventing paid truth', async () => {
  const sql = await read(foundation)
  assert.match(sql, /create table if not exists public\.project_change_orders/i)
  assert.match(sql, /quote_id uuid null references public\.quotes/i)
  assert.match(sql, /quote_version_id uuid null references public\.quote_versions/i)
  assert.match(sql, /payment_order_id uuid null references public\.payment_orders/i)
  assert.match(sql, /status = 'paid'.*payment_order_id is not null/is)
  assert.doesNotMatch(sql, /grant\s+(insert|update|delete|all).*project_change_orders.*authenticated/i)
})

test('delivery readiness requires Published Preview, resolved work and satisfied criteria', async () => {
  const sql = await read(hardening)
  assert.match(sql, /create or replace function private\.enforce_delivery_ready_boundary\(\)/i)
  assert.match(sql, /published_preview_required_for_delivery/i)
  assert.match(sql, /open_revision_blocks_delivery_ready/i)
  assert.match(sql, /open_change_order_blocks_delivery_ready/i)
  assert.match(sql, /acceptance_criteria_not_satisfied/i)
  assert.match(sql, /accepted_delivery_immutable/i)
})

test('browser can insert only delivery_package_id and authoritative acceptance fields are database-owned', async () => {
  const sql = await read(foundation)
  assert.match(sql, /grant insert \(delivery_package_id\) on public\.project_delivery_acceptances to authenticated/i)
  assert.doesNotMatch(sql, /grant insert on public\.project_delivery_acceptances to authenticated/i)
  assert.match(sql, /create or replace function private\.finalize_delivery_acceptance\(\)/i)
  assert.match(sql, /new\.customer_project_id := v_package\.customer_project_id/i)
  assert.match(sql, /new\.user_id := v_uid/i)
  assert.match(sql, /new\.package_sha256 := v_package\.package_sha256/i)
  assert.match(sql, /open_revision_blocks_delivery_acceptance/i)
  assert.match(sql, /open_change_order_blocks_delivery_acceptance/i)
})

test('delivery acceptance cannot self authorize production release', async () => {
  const foundationSql = await read(foundation)
  const hardeningSql = await read(hardening)
  assert.match(foundationSql, /project_release_authorizations/i)
  assert.match(foundationSql, /revoke all on public\.project_release_authorizations from anon, authenticated/i)
  assert.doesNotMatch(foundationSql, /grant\s+select\s+on public\.project_release_authorizations\s+to authenticated/i)
  assert.match(foundationSql, /Deliberately does NOT merge, deploy Production, submit stores, transfer domains, or expose credentials/i)
  assert.match(hardeningSql, /customer_delivery_acceptance_required/i)
  assert.match(hardeningSql, /active_evento_operator_required/i)
})

test('customer delivery artifacts cannot contain secret values', async () => {
  const sql = await read(foundation)
  assert.match(sql, /contains_secret_value boolean not null default false check \(contains_secret_value = false\)/i)
  assert.match(sql, /project_delivery_artifacts_select_own/i)
})

test('phone-first delivery page reads only customer-safe Gate 8 tables', async () => {
  const page = await read('app/projects/[id]/delivery/page.js')
  const action = await read('app/projects/[id]/delivery/actions.js')
  for (const table of ['project_revision_cases','project_change_orders','project_delivery_packages','project_delivery_artifacts','project_delivery_acceptances']) {
    assert.match(page, new RegExp(`from\\('${table}'\\)`, 'i'))
  }
  assert.doesNotMatch(page, /project_release_authorizations|evento_operator_grants|repository_full_name|branch_name|service_role|SUPABASE_SERVICE_ROLE_KEY|provider_checkout_session_id|provider_payment_intent_id/i)
  assert.match(action, /EVENTO_DELIVERY_ACCEPTANCE_WRITE_MODE !== 'enabled'/)
  assert.match(action, /getClaims\(\)/)
  assert.match(action, /is_anonymous === true/)
  assert.match(action, /insert\(\{ delivery_package_id: deliveryPackageId \}\)/)
  assert.doesNotMatch(action, /service_role|SUPABASE_SERVICE_ROLE_KEY|sb_secret_/i)
})

test('Gate 8 language keeps delivery acceptance separate from production release', async () => {
  const page = await read('app/projects/[id]/delivery/page.js')
  const doc = await read('docs/REVISION_DELIVERY_MODEL.md')
  assert.match(page, /قبول حزمة التسليم يثبت قبول العميل للحزمة وبصمتها فقط/)
  assert.match(page, /Production deploy.*Release Authorization بشرية منفصلة/is)
  assert.match(doc, /Preview feedback ≠ included revision ≠ change order ≠ delivery acceptance ≠ release authority/i)
})
