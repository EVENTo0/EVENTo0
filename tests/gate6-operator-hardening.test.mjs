import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')
const hardening = 'supabase/migrations/20260811211900_project_orchestration_operator_hardening.sql'

test('Gate 6 has an internal operator registry with no browser grants', async () => {
  const sql = await read(hardening)
  assert.match(sql, /create table if not exists public\.evento_operator_grants/i)
  assert.match(sql, /operator_role.*owner.*operator.*reviewer/is)
  assert.match(sql, /alter table public\.evento_operator_grants enable row level security/i)
  assert.match(sql, /revoke all on public\.evento_operator_grants from anon, authenticated/i)
  assert.doesNotMatch(sql, /grant\s+select\s+on public\.evento_operator_grants\s+to authenticated/i)
})

test('fulfillment authorization must reference an active EVENTO owner/operator', async () => {
  const sql = await read(hardening)
  assert.match(sql, /fulfillment_authorizations_operator_fkey/i)
  assert.match(sql, /require_active_fulfillment_operator/i)
  assert.match(sql, /g\.active = true/i)
  assert.match(sql, /g\.operator_role in \('owner','operator'\)/i)
  assert.match(sql, /active_evento_operator_required/i)
})

test('sensitive agent approval decisions require an active human operator/reviewer', async () => {
  const sql = await read(hardening)
  assert.match(sql, /project_approval_requests_decider_operator_fkey/i)
  assert.match(sql, /require_active_project_approval_decider/i)
  assert.match(sql, /human_operator_decision_required/i)
  assert.match(sql, /active_evento_reviewer_required/i)
  assert.match(sql, /g\.operator_role in \('owner','operator','reviewer'\)/i)
})

test('operator validation helpers stay private and unavailable as customer RPCs', async () => {
  const sql = await read(hardening)
  assert.match(sql, /create or replace function private\.require_active_fulfillment_operator\(\)/i)
  assert.match(sql, /create or replace function private\.require_active_project_approval_decider\(\)/i)
  assert.match(sql, /revoke all on function private\.require_active_fulfillment_operator\(\) from public, anon, authenticated/i)
  assert.doesNotMatch(sql, /grant execute on function private\.(require_active_fulfillment_operator|require_active_project_approval_decider).*authenticated/i)
})
