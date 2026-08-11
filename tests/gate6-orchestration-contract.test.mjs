import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')
const migrationPath = 'supabase/migrations/20260811_project_workspace_agent_orchestration_foundation.sql'

test('Gate 6 fulfillment is an independent default-off application gate', async () => {
  const env = await read('.env.example')
  assert.match(env, /EVENTO_FULFILLMENT_WRITE_MODE=disabled/)
})

test('verified payment alone does not authorize fulfillment', async () => {
  const migration = await read(migrationPath)
  assert.match(migration, /create table if not exists public\.fulfillment_authorizations/i)
  assert.match(migration, /verified_paid_order_required/i)
  assert.match(migration, /full_order_amount_not_verified/i)
  assert.match(migration, /refunded_order_cannot_authorize_fulfillment/i)
  assert.match(migration, /accepted_contract_required/i)
  assert.match(migration, /authorized_by_user_id uuid not null references auth\.users/i)
  assert.match(migration, /authorization_scope.*project_start.*milestone_start/is)
})

test('fulfillment binding fields are derived from the exact verified payment order', async () => {
  const migration = await read(migrationPath)
  assert.match(migration, /payment_orders_fulfillment_binding_unique/i)
  assert.match(migration, /foreign key \(payment_order_id, request_id, user_id, contract_acceptance_id, agreement_id, agreement_version_id, quote_id, quote_version_id\)[\s\S]*references public\.payment_orders/i)
  assert.match(migration, /new\.request_id := v_order\.request_id/i)
  assert.match(migration, /new\.contract_acceptance_id := v_order\.contract_acceptance_id/i)
  assert.match(migration, /new\.authorized_amount_aed := v_order\.amount_paid_aed/i)
})

test('Gate 6 exposes only safe customer project state to browser roles', async () => {
  const migration = await read(migrationPath)
  for (const table of ['customer_projects','project_milestones','project_acceptance_criteria']) {
    assert.match(migration, new RegExp(`grant select on public\\.${table} to authenticated`, 'i'))
  }
  for (const table of ['fulfillment_authorizations','project_workspaces','project_agent_assignments','project_work_items','project_build_runs','project_approval_requests','project_orchestration_events']) {
    assert.match(migration, new RegExp(`revoke all on public\\.${table} from anon, authenticated`, 'i'))
    assert.doesNotMatch(migration, new RegExp(`grant\\s+select\\s+on public\\.${table}\\s+to authenticated`, 'i'))
  }
  assert.match(migration, /customer_visible = true/i)
  assert.match(migration, /is_anonymous/i)
})

test('agent assignment model permanently forbids self approval and production authority', async () => {
  const migration = await read(migrationPath)
  for (const capability of [
    'can_approve_pull_request',
    'can_merge',
    'can_production_deploy',
    'can_change_billing',
    'can_change_contract',
    'can_change_scope',
  ]) {
    assert.match(migration, new RegExp(`${capability} boolean not null default false check \\(${capability} = false\\)`, 'i'))
  }
  assert.match(migration, /can_open_pull_request boolean not null default true/i)
  assert.match(migration, /can_run_tests boolean not null default true/i)
  assert.match(migration, /can_request_approval boolean not null default true/i)
})

test('agent build evidence cannot represent production deployment', async () => {
  const migration = await read(migrationPath)
  assert.match(migration, /create table if not exists public\.project_build_runs/i)
  assert.match(migration, /environment text not null check \(environment in \('ci','preview'\)\)/i)
  assert.doesNotMatch(migration, /environment in \([^)]*'production'/i)
})

test('sensitive agent actions route to a human decision record', async () => {
  const migration = await read(migrationPath)
  assert.match(migration, /create table if not exists public\.project_approval_requests/i)
  assert.match(migration, /approval_type.*merge.*production_deploy.*release.*scope_change.*cost_change.*contract_change.*destructive_action/is)
  assert.match(migration, /decided_by_user_id uuid null references auth\.users/i)
  assert.match(migration, /status in \('approved','rejected'\) and decided_by_user_id is not null and decided_at is not null/i)
})

test('Gate 6 elevated fulfillment helpers stay private and are not browser RPCs', async () => {
  const migration = await read(migrationPath)
  assert.match(migration, /create or replace function private\.validate_fulfillment_authorization\(\)/i)
  assert.match(migration, /create or replace function private\.create_customer_project_from_authorization\(\)/i)
  assert.match(migration, /revoke all on function private\.validate_fulfillment_authorization\(\) from public, anon, authenticated/i)
  assert.doesNotMatch(migration, /grant execute on function private\.(validate_fulfillment_authorization|create_customer_project_from_authorization).*authenticated/i)
})

test('customer workspace page is read-only and never queries repository or agent internals', async () => {
  const page = await read('app/projects/[id]/workspace/page.js')
  assert.match(page, /from\('customer_projects'\)/)
  assert.match(page, /from\('project_milestones'\)/)
  assert.match(page, /from\('project_acceptance_criteria'\)/)
  assert.match(page, /EVENTO_FULFILLMENT_WRITE_MODE/)
  assert.doesNotMatch(page, /from\('(project_workspaces|project_agent_assignments|project_work_items|project_build_runs|project_approval_requests|project_orchestration_events)'\)/i)
  assert.doesNotMatch(page, /repository_full_name|working_branch_prefix|service_role|SUPABASE_SERVICE_ROLE_KEY/i)
})
