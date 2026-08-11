import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')
const foundation = 'supabase/migrations/20260811215000_phone_first_preview_customer_status_foundation.sql'
const hardening = 'supabase/migrations/20260811220000_preview_publish_boundary_hardening.sql'

test('Gate 7 preview publishing and feedback are independent default-off gates', async () => {
  const env = await read('.env.example')
  assert.match(env, /EVENTO_PREVIEW_PUBLISH_MODE=disabled/)
  assert.match(env, /EVENTO_PREVIEW_FEEDBACK_WRITE_MODE=disabled/)
})

test('customer preview rows exclude repository and provider build internals', async () => {
  const sql = await read(foundation)
  assert.match(sql, /create table if not exists public\.project_preview_releases/i)
  assert.match(sql, /create table if not exists public\.project_preview_bindings/i)
  assert.match(sql, /revoke all on public\.project_preview_bindings from anon, authenticated/i)
  assert.doesNotMatch(sql, /grant\s+select\s+on public\.project_preview_bindings\s+to authenticated/i)
  assert.doesNotMatch(sql.match(/create table if not exists public\.project_preview_releases[\s\S]*?\);/i)?.[0] || '', /repository_full_name|source_branch|provider_deployment_id|artifact_ref|source_commit_sha/i)
})

test('only owned active Published previews are customer readable', async () => {
  const sql = await read(foundation)
  assert.match(sql, /project_preview_releases_select_own_published/i)
  assert.match(sql, /\(select auth\.uid\(\)\) = user_id/i)
  assert.match(sql, /customer_visible = true/i)
  assert.match(sql, /status = 'published'/i)
  assert.match(sql, /expires_at is null or expires_at > now\(\)/i)
  assert.match(sql, /is_anonymous/i)
})

test('exact preview binding requires a successful Preview build and matching commit/workspace', async () => {
  const sql = await read(foundation)
  assert.match(sql, /create or replace function private\.validate_preview_release_binding\(\)/i)
  assert.match(sql, /v_build\.environment <> 'preview'/i)
  assert.match(sql, /v_build\.status <> 'succeeded'/i)
  assert.match(sql, /preview_workspace_mismatch/i)
  assert.match(sql, /preview_commit_mismatch/i)
  assert.match(sql, /revoke all on function private\.validate_preview_release_binding\(\) from public, anon, authenticated/i)
})

test('Published preview cannot exist without exact build binding and cannot be silently replaced', async () => {
  const sql = await read(hardening)
  assert.match(sql, /preview_binding_required_before_publish/i)
  assert.match(sql, /successful_preview_build_required/i)
  assert.match(sql, /preview_build_environment_required/i)
  assert.match(sql, /published_preview_immutable/i)
  assert.match(sql, /before insert or update on public\.project_preview_releases/i)
  assert.match(sql, /revoke all on function private\.enforce_preview_release_publish_boundary\(\) from public, anon, authenticated/i)
})

test('customer feedback insert is narrow and authoritative identity is database-owned', async () => {
  const sql = await read(foundation)
  assert.match(sql, /grant insert \(preview_release_id, feedback_kind, body\) on public\.project_preview_feedback to authenticated/i)
  assert.doesNotMatch(sql, /grant insert on public\.project_preview_feedback to authenticated/i)
  assert.match(sql, /create or replace function private\.finalize_preview_feedback\(\)/i)
  assert.match(sql, /new\.customer_project_id := v_release\.customer_project_id/i)
  assert.match(sql, /new\.request_id := v_release\.request_id/i)
  assert.match(sql, /new\.user_id := v_uid/i)
  assert.match(sql, /new\.revision_counted := false/i)
  assert.match(sql, /preview_not_published|preview_expired|preview_owner_mismatch/i)
})

test('revision requests do not automatically consume the commercial revision', async () => {
  const sql = await read(foundation)
  assert.match(sql, /revision_counted boolean not null default false/i)
  assert.match(sql, /revision_counted = false or feedback_kind = 'revision_request'/i)
  assert.match(sql, /new\.revision_counted := false/i)
})

test('phone-first workspace reads safe Preview tables and never reads internal binding data', async () => {
  const page = await read('app/projects/[id]/workspace/page.js')
  const action = await read('app/projects/[id]/workspace/actions.js')
  assert.match(page, /from\('project_preview_releases'\)/)
  assert.match(page, /from\('project_preview_media'\)/)
  assert.match(page, /from\('project_preview_feedback'\)/)
  assert.match(page, /فتح المعاينة/)
  assert.match(page, /submitPreviewFeedback/)
  assert.doesNotMatch(page, /project_preview_bindings|provider_deployment_id|source_branch|source_commit_sha|repository_full_name/i)
  assert.match(action, /EVENTO_PREVIEW_FEEDBACK_WRITE_MODE !== 'enabled'/)
  assert.match(action, /getClaims\(\)/)
  assert.match(action, /is_anonymous === true/)
  assert.doesNotMatch(action, /service_role|SUPABASE_SERVICE_ROLE_KEY|sb_secret_/i)
})

test('Preview review language does not equate Preview with Production or final acceptance', async () => {
  const page = await read('app/projects/[id]/workspace/page.js')
  const doc = await read('docs/PREVIEW_REVIEW_MODEL.md')
  assert.match(page, /Preview للمراجعة فقط وليست Production أو تسليمًا نهائيًا/)
  assert.match(doc, /Preview is not Production/i)
  assert.match(doc, /approval_ready.*not legal\/project acceptance/is)
})
