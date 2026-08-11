-- EVENTO Revenue Engine security hardening candidate
-- 2026-08-11
-- REVIEW REQUIRED. Do not apply directly to production from an agent session.
-- This migration preserves the existing mobile RPC contract while tightening
-- permanent-user access and RLS performance. Apply first to a reviewed dev branch.

begin;

-- 1) Anonymous sign-in users use the authenticated Postgres role. EVENTO customer
-- project data requires a durable/permanent account, so enforce that independently
-- of existing permissive ownership policies.

drop policy if exists project_requests_permanent_users_only on public.project_requests;
create policy project_requests_permanent_users_only
on public.project_requests
as restrictive
for all
to authenticated
using ((select coalesce((auth.jwt()->>'is_anonymous')::boolean, false)) is false)
with check ((select coalesce((auth.jwt()->>'is_anonymous')::boolean, false)) is false);

drop policy if exists request_analyses_permanent_users_only on public.request_analyses;
create policy request_analyses_permanent_users_only
on public.request_analyses
as restrictive
for all
to authenticated
using ((select coalesce((auth.jwt()->>'is_anonymous')::boolean, false)) is false)
with check ((select coalesce((auth.jwt()->>'is_anonymous')::boolean, false)) is false);

drop policy if exists project_request_events_permanent_users_only on public.project_request_events;
create policy project_request_events_permanent_users_only
on public.project_request_events
as restrictive
for all
to authenticated
using ((select coalesce((auth.jwt()->>'is_anonymous')::boolean, false)) is false)
with check ((select coalesce((auth.jwt()->>'is_anonymous')::boolean, false)) is false);

drop policy if exists project_workflows_permanent_users_only on public.project_workflows;
create policy project_workflows_permanent_users_only
on public.project_workflows
as restrictive
for all
to authenticated
using ((select coalesce((auth.jwt()->>'is_anonymous')::boolean, false)) is false)
with check ((select coalesce((auth.jwt()->>'is_anonymous')::boolean, false)) is false);

-- 2) Preserve SECURITY DEFINER RPCs because the current EVENTO Mobile contract
-- calls them directly and they perform writes that customers do not otherwise get.
-- Add explicit permanent-user checks while retaining auth.uid + ownership checks.

create or replace function public.start_project_workflow(p_request_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid;
  v_status text;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if coalesce((auth.jwt()->>'is_anonymous')::boolean, false) then raise exception 'permanent_account_required'; end if;

  select user_id, status into v_user_id, v_status
  from public.project_requests
  where id = p_request_id
  for update;

  if v_user_id is null then raise exception 'request_not_found'; end if;
  if v_user_id <> auth.uid() then raise exception 'forbidden'; end if;
  if v_status not in ('analyzed','awaiting_scope') then raise exception 'workflow_not_startable'; end if;

  insert into public.project_workflows(request_id,user_id,current_stage,progress_percent)
  values (p_request_id,v_user_id,'scope_review',20)
  on conflict (request_id) do update set
    current_stage = case when public.project_workflows.current_stage = 'analysis_complete' then 'scope_review' else public.project_workflows.current_stage end,
    progress_percent = greatest(public.project_workflows.progress_percent,20),
    updated_at = now();

  update public.project_requests set status='awaiting_scope' where id=p_request_id;

  if not exists (
    select 1 from public.project_request_events
    where request_id=p_request_id and status='awaiting_scope'
  ) then
    insert into public.project_request_events(request_id,user_id,status,note,note_ar)
    values (p_request_id,v_user_id,'awaiting_scope','Project scope is ready for customer review.','نطاق المشروع جاهز لمراجعة العميل.');
  end if;

  return 'scope_review';
end;
$function$;

create or replace function public.approve_project_scope(p_request_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid;
  v_status text;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if coalesce((auth.jwt()->>'is_anonymous')::boolean, false) then raise exception 'permanent_account_required'; end if;

  select user_id,status::text into v_user_id,v_status
  from public.project_requests
  where id=p_request_id
  for update;

  if v_user_id is null then raise exception 'request_not_found'; end if;
  if v_user_id <> auth.uid() then raise exception 'forbidden'; end if;
  if v_status <> 'awaiting_scope' then raise exception 'scope_not_approvable'; end if;

  update public.project_workflows
  set current_stage='scope_approved', progress_percent=30,
      scope_approved_at=coalesce(scope_approved_at,now()), updated_at=now()
  where request_id=p_request_id and user_id=v_user_id;

  if not found then raise exception 'workflow_not_found'; end if;

  insert into public.project_request_events(request_id,user_id,status,note,note_ar)
  values (p_request_id,v_user_id,'approved','Customer approved the proposed project scope.','وافق العميل على نطاق المشروع المقترح.');

  return 'scope_approved';
end;
$function$;

-- Make the exposure intentional/explicit instead of inherited from PUBLIC.
revoke all on function public.start_project_workflow(uuid) from public;
revoke all on function public.approve_project_scope(uuid) from public;
grant execute on function public.start_project_workflow(uuid) to authenticated;
grant execute on function public.approve_project_scope(uuid) to authenticated;

-- 3) Optimize the remaining workflow ownership policy flagged by the advisor.
drop policy if exists project_workflows_select_own on public.project_workflows;
create policy project_workflows_select_own
on public.project_workflows
for select
to authenticated
using (((select auth.uid()) is not null) and ((select auth.uid()) = user_id));

-- 4) Cover advisor-reported workflow foreign-key paths. Keep existing indexes;
-- low traffic is not sufficient evidence to drop currently-unused indexes.
create index if not exists project_workflows_user_id_idx
  on public.project_workflows(user_id);
create index if not exists project_workflows_request_user_idx
  on public.project_workflows(request_id,user_id);

commit;
