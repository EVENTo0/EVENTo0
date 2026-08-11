-- EVENTO Gate 6 hardening — active operator registry
-- REVIEW ONLY. Apply after 20260811_project_workspace_agent_orchestration_foundation.sql in isolated test first.
-- This closes the gap between "an auth.users UUID exists" and "this identity is an authorized EVENTO operator".

create table if not exists public.evento_operator_grants (
  user_id uuid primary key references auth.users(id) on delete restrict,
  operator_role text not null check (operator_role in ('owner','operator','reviewer')),
  active boolean not null default true,
  note text null check (note is null or char_length(note) <= 2000),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz null,
  check ((active = true and revoked_at is null) or active = false)
);

alter table public.evento_operator_grants enable row level security;
revoke all on public.evento_operator_grants from anon, authenticated;

alter table public.fulfillment_authorizations
  add constraint fulfillment_authorizations_operator_fkey
  foreign key (authorized_by_user_id) references public.evento_operator_grants(user_id) on delete restrict;

alter table public.project_workspaces
  add constraint project_workspaces_operator_fkey
  foreign key (created_by_user_id) references public.evento_operator_grants(user_id) on delete restrict;

alter table public.project_agent_assignments
  add constraint project_agent_assignments_operator_fkey
  foreign key (assigned_by_user_id) references public.evento_operator_grants(user_id) on delete restrict;

alter table public.project_approval_requests
  add constraint project_approval_requests_decider_operator_fkey
  foreign key (decided_by_user_id) references public.evento_operator_grants(user_id) on delete restrict;

create or replace function private.require_active_fulfillment_operator()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.evento_operator_grants g
    where g.user_id = new.authorized_by_user_id
      and g.active = true
      and g.operator_role in ('owner','operator')
  ) then
    raise exception 'active_evento_operator_required';
  end if;
  return new;
end;
$$;

create or replace function private.require_active_project_approval_decider()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status in ('approved','rejected') then
    if new.decided_by_user_id is null then
      raise exception 'human_operator_decision_required';
    end if;
    if not exists (
      select 1
      from public.evento_operator_grants g
      where g.user_id = new.decided_by_user_id
        and g.active = true
        and g.operator_role in ('owner','operator','reviewer')
    ) then
      raise exception 'active_evento_reviewer_required';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.require_active_fulfillment_operator() from public, anon, authenticated;
revoke all on function private.require_active_project_approval_decider() from public, anon, authenticated;

drop trigger if exists fulfillment_authorization_operator_before on public.fulfillment_authorizations;
create trigger fulfillment_authorization_operator_before
before insert or update on public.fulfillment_authorizations
for each row execute function private.require_active_fulfillment_operator();

drop trigger if exists project_approval_operator_before on public.project_approval_requests;
create trigger project_approval_operator_before
before insert or update on public.project_approval_requests
for each row execute function private.require_active_project_approval_decider();

comment on table public.evento_operator_grants is 'Internal EVENTO operator registry. No browser grants. Seed owner/operator identities explicitly in isolated test before Gate 6 activation.';
comment on function private.require_active_fulfillment_operator() is 'Requires fulfillment authorization to come from an active EVENTO owner/operator record.';
comment on function private.require_active_project_approval_decider() is 'Requires sensitive agent approval decisions to be recorded by an active EVENTO human reviewer/operator.';
