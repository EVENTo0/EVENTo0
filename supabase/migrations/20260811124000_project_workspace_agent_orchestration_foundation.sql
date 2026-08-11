-- EVENTO Gate 6 — Project Workspace & Agent Build Orchestration
-- REVIEW ONLY. Do not apply directly to production.
-- Apply only after Gate 0–5 migrations are green in an isolated Supabase branch/test environment.
-- A verified payment does NOT automatically authorize fulfillment. A separate human authorization is required.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'evento_customer_project_status') then
    create type public.evento_customer_project_status as enum ('authorized','planning','building','blocked','review','completed','cancelled');
  end if;
  if not exists (select 1 from pg_type where typname = 'evento_project_milestone_status') then
    create type public.evento_project_milestone_status as enum ('planned','ready','in_progress','blocked','review','approved','completed','cancelled');
  end if;
  if not exists (select 1 from pg_type where typname = 'evento_agent_assignment_status') then
    create type public.evento_agent_assignment_status as enum ('active','paused','revoked','completed');
  end if;
  if not exists (select 1 from pg_type where typname = 'evento_work_item_status') then
    create type public.evento_work_item_status as enum ('planned','ready','in_progress','blocked','review','done','cancelled');
  end if;
  if not exists (select 1 from pg_type where typname = 'evento_build_status') then
    create type public.evento_build_status as enum ('queued','running','succeeded','failed','cancelled');
  end if;
  if not exists (select 1 from pg_type where typname = 'evento_approval_status') then
    create type public.evento_approval_status as enum ('pending','approved','rejected','cancelled');
  end if;
end $$;

alter table public.payment_orders
  add constraint payment_orders_fulfillment_binding_unique
  unique (id, request_id, user_id, contract_acceptance_id, agreement_id, agreement_version_id, quote_id, quote_version_id);

-- Internal owner/operator authorization. Browser/customer roles receive no grants.
create table if not exists public.fulfillment_authorizations (
  id uuid primary key default gen_random_uuid(),
  payment_order_id uuid not null,
  request_id uuid not null,
  user_id uuid not null,
  contract_acceptance_id uuid not null,
  agreement_id uuid not null,
  agreement_version_id uuid not null,
  quote_id uuid not null,
  quote_version_id uuid not null,
  authorization_scope text not null check (authorization_scope in ('project_start','milestone_start')),
  authorization_key text not null check (char_length(authorization_key) between 2 and 120),
  authorized_amount_aed numeric(14,2) not null check (authorized_amount_aed > 0),
  prepared_by_kind text not null check (prepared_by_kind in ('human','agent')),
  prepared_by_ref text not null check (char_length(prepared_by_ref) between 2 and 180),
  authorized_by_user_id uuid not null references auth.users(id) on delete restrict,
  owner_review_note text not null check (char_length(owner_review_note) between 10 and 3000),
  authorized_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (id, request_id, user_id),
  unique (payment_order_id, authorization_scope, authorization_key),
  foreign key (payment_order_id, request_id, user_id, contract_acceptance_id, agreement_id, agreement_version_id, quote_id, quote_version_id)
    references public.payment_orders(id, request_id, user_id, contract_acceptance_id, agreement_id, agreement_version_id, quote_id, quote_version_id) on delete restrict,
  check (
    (authorization_scope = 'project_start' and authorization_key = 'project')
    or (authorization_scope = 'milestone_start' and authorization_key <> 'project')
  )
);

create table if not exists public.customer_projects (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null,
  user_id uuid not null,
  start_authorization_id uuid not null,
  project_code text not null unique,
  title text not null check (char_length(title) between 3 and 220),
  status public.evento_customer_project_status not null default 'authorized',
  progress_percent integer not null default 0 check (progress_percent between 0 and 100),
  current_milestone_id uuid null,
  started_at timestamptz null,
  completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, request_id, user_id),
  unique (request_id, user_id),
  foreign key (start_authorization_id, request_id, user_id)
    references public.fulfillment_authorizations(id, request_id, user_id) on delete restrict
);

create table if not exists public.project_milestones (
  id uuid primary key default gen_random_uuid(),
  customer_project_id uuid not null,
  request_id uuid not null,
  user_id uuid not null,
  sequence integer not null check (sequence > 0),
  milestone_code text not null check (char_length(milestone_code) between 2 and 80),
  title_ar text not null check (char_length(title_ar) between 3 and 220),
  title_en text null check (title_en is null or char_length(title_en) between 3 and 220),
  status public.evento_project_milestone_status not null default 'planned',
  progress_percent integer not null default 0 check (progress_percent between 0 and 100),
  acceptance_required boolean not null default true,
  customer_visible boolean not null default true,
  target_at timestamptz null,
  started_at timestamptz null,
  completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_project_id, sequence),
  unique (customer_project_id, milestone_code),
  unique (id, customer_project_id, request_id, user_id),
  foreign key (customer_project_id, request_id, user_id)
    references public.customer_projects(id, request_id, user_id) on delete restrict
);

alter table public.customer_projects
  add constraint customer_projects_current_milestone_fkey
  foreign key (current_milestone_id, id, request_id, user_id)
  references public.project_milestones(id, customer_project_id, request_id, user_id)
  deferrable initially deferred;

create table if not exists public.project_acceptance_criteria (
  id uuid primary key default gen_random_uuid(),
  milestone_id uuid not null,
  customer_project_id uuid not null,
  request_id uuid not null,
  user_id uuid not null,
  criterion_code text not null check (char_length(criterion_code) between 2 and 80),
  criterion_ar text not null check (char_length(criterion_ar) between 5 and 1200),
  criterion_en text null check (criterion_en is null or char_length(criterion_en) between 5 and 1200),
  status text not null default 'pending' check (status in ('pending','passed','failed','waived')),
  customer_visible boolean not null default true,
  evidence_summary text null check (evidence_summary is null or char_length(evidence_summary) <= 3000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (milestone_id, criterion_code),
  foreign key (milestone_id, customer_project_id, request_id, user_id)
    references public.project_milestones(id, customer_project_id, request_id, user_id) on delete restrict
);

-- Internal workspace registry. Repository links never imply deployment authority and contain no credentials.
create table if not exists public.project_workspaces (
  id uuid primary key default gen_random_uuid(),
  customer_project_id uuid not null references public.customer_projects(id) on delete restrict,
  workspace_role text not null check (workspace_role in ('primary','web','mobile','backend','game','design','data','content','other')),
  provider text not null default 'github' check (provider in ('github','external')),
  repository_full_name text null check (repository_full_name is null or repository_full_name ~ '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$'),
  repository_visibility text not null default 'private' check (repository_visibility in ('private','internal','public')),
  default_branch text not null default 'main',
  working_branch_prefix text not null default 'evento/',
  provisioning_status text not null default 'planned' check (provisioning_status in ('planned','provisioning','ready','blocked','archived')),
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  owner_approved_at timestamptz null,
  provisioned_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_project_id, workspace_role, provider)
);

-- Agent permissions are deliberately capability-limited. Prohibited capabilities are database-enforced false.
create table if not exists public.project_agent_assignments (
  id uuid primary key default gen_random_uuid(),
  customer_project_id uuid not null references public.customer_projects(id) on delete restrict,
  agent_key text not null check (char_length(agent_key) between 2 and 120),
  role_key text not null check (char_length(role_key) between 2 and 120),
  status public.evento_agent_assignment_status not null default 'active',
  can_prepare_changes boolean not null default true,
  can_create_work_branch boolean not null default true,
  can_commit_work_branch boolean not null default true,
  can_open_pull_request boolean not null default true,
  can_run_tests boolean not null default true,
  can_create_preview boolean not null default true,
  can_request_approval boolean not null default true,
  can_approve_pull_request boolean not null default false check (can_approve_pull_request = false),
  can_merge boolean not null default false check (can_merge = false),
  can_production_deploy boolean not null default false check (can_production_deploy = false),
  can_change_billing boolean not null default false check (can_change_billing = false),
  can_change_contract boolean not null default false check (can_change_contract = false),
  can_change_scope boolean not null default false check (can_change_scope = false),
  assigned_by_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_project_id, agent_key, role_key)
);

create table if not exists public.project_work_items (
  id uuid primary key default gen_random_uuid(),
  customer_project_id uuid not null references public.customer_projects(id) on delete restrict,
  milestone_id uuid null references public.project_milestones(id) on delete restrict,
  agent_assignment_id uuid null references public.project_agent_assignments(id) on delete set null,
  work_type text not null check (work_type in ('discovery','design','implementation','migration','test','security','performance','documentation','release_prep','other')),
  title text not null check (char_length(title) between 3 and 220),
  status public.evento_work_item_status not null default 'planned',
  working_branch text null,
  acceptance_snapshot jsonb not null default '[]'::jsonb check (jsonb_typeof(acceptance_snapshot) = 'array'),
  created_at timestamptz not null default now(),
  started_at timestamptz null,
  completed_at timestamptz null,
  updated_at timestamptz not null default now()
);

-- Agent-originated build evidence is restricted to CI/Preview. Production is a separate human-controlled release gate.
create table if not exists public.project_build_runs (
  id uuid primary key default gen_random_uuid(),
  customer_project_id uuid not null references public.customer_projects(id) on delete restrict,
  work_item_id uuid null references public.project_work_items(id) on delete set null,
  workspace_id uuid not null references public.project_workspaces(id) on delete restrict,
  environment text not null check (environment in ('ci','preview')),
  commit_sha text not null check (commit_sha ~ '^[0-9a-fA-F]{7,64}$'),
  external_run_id text null,
  status public.evento_build_status not null default 'queued',
  test_summary jsonb not null default '{}'::jsonb check (jsonb_typeof(test_summary) = 'object'),
  security_summary jsonb not null default '{}'::jsonb check (jsonb_typeof(security_summary) = 'object'),
  started_at timestamptz null,
  completed_at timestamptz null,
  created_at timestamptz not null default now()
);

create table if not exists public.project_approval_requests (
  id uuid primary key default gen_random_uuid(),
  customer_project_id uuid not null references public.customer_projects(id) on delete restrict,
  requested_by_assignment_id uuid not null references public.project_agent_assignments(id) on delete restrict,
  approval_type text not null check (approval_type in ('merge','production_deploy','release','scope_change','cost_change','contract_change','destructive_action')),
  target_ref text not null check (char_length(target_ref) between 1 and 500),
  rationale text not null check (char_length(rationale) between 10 and 4000),
  status public.evento_approval_status not null default 'pending',
  requested_at timestamptz not null default now(),
  decided_by_user_id uuid null references auth.users(id) on delete restrict,
  decided_at timestamptz null,
  decision_note text null check (decision_note is null or char_length(decision_note) <= 4000),
  check (
    (status = 'pending' and decided_by_user_id is null and decided_at is null)
    or (status in ('approved','rejected') and decided_by_user_id is not null and decided_at is not null)
    or (status = 'cancelled')
  )
);

create table if not exists public.project_orchestration_events (
  id uuid primary key default gen_random_uuid(),
  customer_project_id uuid not null references public.customer_projects(id) on delete restrict,
  actor_kind text not null check (actor_kind in ('human','agent','system')),
  actor_ref text not null check (char_length(actor_ref) between 1 and 180),
  event_kind text not null check (char_length(event_kind) between 2 and 120),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists fulfillment_authorizations_order_idx on public.fulfillment_authorizations(payment_order_id, authorized_at desc);
create index if not exists customer_projects_user_created_idx on public.customer_projects(user_id, created_at desc);
create index if not exists project_milestones_project_sequence_idx on public.project_milestones(customer_project_id, sequence);
create index if not exists project_acceptance_criteria_project_idx on public.project_acceptance_criteria(customer_project_id, milestone_id);
create index if not exists project_work_items_project_status_idx on public.project_work_items(customer_project_id, status);
create index if not exists project_build_runs_project_created_idx on public.project_build_runs(customer_project_id, created_at desc);
create index if not exists project_approval_requests_project_status_idx on public.project_approval_requests(customer_project_id, status);
create index if not exists project_orchestration_events_project_created_idx on public.project_orchestration_events(customer_project_id, created_at desc);

alter table public.fulfillment_authorizations enable row level security;
alter table public.customer_projects enable row level security;
alter table public.project_milestones enable row level security;
alter table public.project_acceptance_criteria enable row level security;
alter table public.project_workspaces enable row level security;
alter table public.project_agent_assignments enable row level security;
alter table public.project_work_items enable row level security;
alter table public.project_build_runs enable row level security;
alter table public.project_approval_requests enable row level security;
alter table public.project_orchestration_events enable row level security;

revoke all on public.fulfillment_authorizations from anon, authenticated;
revoke all on public.customer_projects from anon, authenticated;
revoke all on public.project_milestones from anon, authenticated;
revoke all on public.project_acceptance_criteria from anon, authenticated;
revoke all on public.project_workspaces from anon, authenticated;
revoke all on public.project_agent_assignments from anon, authenticated;
revoke all on public.project_work_items from anon, authenticated;
revoke all on public.project_build_runs from anon, authenticated;
revoke all on public.project_approval_requests from anon, authenticated;
revoke all on public.project_orchestration_events from anon, authenticated;

-- Customers may read only safe project/milestone/acceptance information.
grant select on public.customer_projects to authenticated;
grant select on public.project_milestones to authenticated;
grant select on public.project_acceptance_criteria to authenticated;
-- Fulfillment authorization, repositories, agent assignments, internal work/build logs and approval queues are not browser-readable.

drop policy if exists customer_projects_select_own on public.customer_projects;
create policy customer_projects_select_own
on public.customer_projects for select
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
  and coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false
);

drop policy if exists project_milestones_select_own_visible on public.project_milestones;
create policy project_milestones_select_own_visible
on public.project_milestones for select
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
  and customer_visible = true
  and coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false
);

drop policy if exists project_acceptance_criteria_select_own_visible on public.project_acceptance_criteria;
create policy project_acceptance_criteria_select_own_visible
on public.project_acceptance_criteria for select
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
  and customer_visible = true
  and coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false
);

create or replace function private.validate_fulfillment_authorization()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.payment_orders%rowtype;
begin
  select po.* into v_order
  from public.payment_orders po
  where po.id = new.payment_order_id
  for update;
  if not found then raise exception 'payment_order_not_found'; end if;

  if v_order.status <> 'paid' then raise exception 'verified_paid_order_required'; end if;
  if v_order.amount_paid_aed <> v_order.amount_due_aed then raise exception 'full_order_amount_not_verified'; end if;
  if v_order.amount_refunded_aed <> 0 then raise exception 'refunded_order_cannot_authorize_fulfillment'; end if;
  if not exists (
    select 1 from public.contract_acceptances ca
    where ca.id = v_order.contract_acceptance_id
      and ca.user_id = v_order.user_id
      and ca.request_id = v_order.request_id
      and ca.agreement_id = v_order.agreement_id
      and ca.agreement_version_id = v_order.agreement_version_id
  ) then
    raise exception 'accepted_contract_required';
  end if;

  -- Binding fields are database-owned snapshots from the verified order.
  new.request_id := v_order.request_id;
  new.user_id := v_order.user_id;
  new.contract_acceptance_id := v_order.contract_acceptance_id;
  new.agreement_id := v_order.agreement_id;
  new.agreement_version_id := v_order.agreement_version_id;
  new.quote_id := v_order.quote_id;
  new.quote_version_id := v_order.quote_version_id;
  new.authorized_amount_aed := v_order.amount_paid_aed;
  new.authorized_at := now();

  return new;
end;
$$;

create or replace function private.create_customer_project_from_authorization()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.project_requests%rowtype;
  v_project_id uuid;
begin
  if new.authorization_scope = 'project_start' then
    select pr.* into v_request
    from public.project_requests pr
    where pr.id = new.request_id;
    if not found then raise exception 'project_request_not_found'; end if;

    insert into public.customer_projects(
      request_id, user_id, start_authorization_id, project_code, title, status, progress_percent, started_at
    ) values (
      new.request_id,
      new.user_id,
      new.id,
      'EVP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
      v_request.title,
      'authorized',
      0,
      null
    )
    returning id into v_project_id;

    insert into public.project_orchestration_events(customer_project_id, actor_kind, actor_ref, event_kind, details)
    values (
      v_project_id,
      'human',
      new.authorized_by_user_id::text,
      'fulfillment_authorized',
      jsonb_build_object('payment_order_id', new.payment_order_id, 'authorization_scope', new.authorization_scope)
    );

    insert into public.project_request_events(request_id,user_id,status,note,note_ar)
    values (
      new.request_id,
      new.user_id,
      'approved',
      'Human fulfillment authorization recorded after verified payment. Controlled project workspace may now be prepared.',
      'تم تسجيل إذن بشري بالتنفيذ بعد الدفع الموثّق. يمكن الآن تجهيز مساحة المشروع تحت الضوابط التشغيلية.'
    );
  else
    if not exists (
      select 1 from public.customer_projects cp
      where cp.request_id = new.request_id and cp.user_id = new.user_id
    ) then
      raise exception 'customer_project_required_for_milestone_authorization';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.validate_fulfillment_authorization() from public, anon, authenticated;
revoke all on function private.create_customer_project_from_authorization() from public, anon, authenticated;

drop trigger if exists fulfillment_authorization_validate_before on public.fulfillment_authorizations;
create trigger fulfillment_authorization_validate_before
before insert on public.fulfillment_authorizations
for each row execute function private.validate_fulfillment_authorization();

drop trigger if exists fulfillment_authorization_project_after on public.fulfillment_authorizations;
create trigger fulfillment_authorization_project_after
after insert on public.fulfillment_authorizations
for each row execute function private.create_customer_project_from_authorization();

comment on table public.fulfillment_authorizations is 'Internal owner/operator decision separating verified payment from permission to begin fulfillment. No browser grants.';
comment on table public.project_agent_assignments is 'Agent capability policy. Database constraints permanently forbid self-approval, merge, production deploy, billing, contract and scope mutation.';
comment on table public.project_build_runs is 'Agent/automation build evidence restricted to CI and Preview; production deployment is outside this table/gate.';
comment on table public.project_approval_requests is 'Agents may request human approval for sensitive actions; decision identity is an auth.users human/operator record.';
