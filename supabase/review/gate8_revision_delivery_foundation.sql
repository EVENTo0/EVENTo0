-- EVENTO Gate 8 — Revision Control & Delivery Acceptance
-- REVIEW CANDIDATE ONLY. This is intentionally NOT in supabase/migrations.
-- Reason: the live Supabase production schema currently uses project_quotes/project_payments/project_build_queue,
-- while the recovery branch models quotes/contracts/payments/workspaces/previews with a deeper versioned schema.
-- Reconcile live schema first, then generate the real migration with `supabase migration new` in an isolated test branch.
-- Never apply this file directly to Production.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'evento_revision_case_status') then
    create type public.evento_revision_case_status as enum ('requested','triaged','authorized','in_progress','preview_ready','resolved','cancelled');
  end if;
  if not exists (select 1 from pg_type where typname = 'evento_revision_disposition') then
    create type public.evento_revision_disposition as enum ('included_revision','warranty_fix','change_order_required','no_change');
  end if;
  if not exists (select 1 from pg_type where typname = 'evento_change_order_status') then
    create type public.evento_change_order_status as enum ('draft','quoted','accepted','paid','rejected','cancelled');
  end if;
  if not exists (select 1 from pg_type where typname = 'evento_delivery_package_status') then
    create type public.evento_delivery_package_status as enum ('draft','ready_for_acceptance','accepted','revoked');
  end if;
end $$;

-- Revision policy snapshot tied to the exact accepted contract version.
create table if not exists public.project_revision_policies (
  id uuid primary key default gen_random_uuid(),
  customer_project_id uuid not null references public.customer_projects(id) on delete restrict,
  request_id uuid not null,
  user_id uuid not null,
  contract_acceptance_id uuid not null references public.contract_acceptances(id) on delete restrict,
  agreement_version_id uuid not null references public.contract_versions(id) on delete restrict,
  included_revision_limit integer not null check (included_revision_limit >= 0 and included_revision_limit <= 20),
  included_revisions_used integer not null default 0 check (included_revisions_used >= 0),
  policy_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(policy_snapshot) = 'object'),
  policy_sha256 text not null check (policy_sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_project_id),
  unique (id, customer_project_id, request_id, user_id),
  check (included_revisions_used <= included_revision_limit)
);

-- One revision case is derived from one exact Gate 7 feedback item.
create table if not exists public.project_revision_cases (
  id uuid primary key default gen_random_uuid(),
  customer_project_id uuid not null,
  request_id uuid not null,
  user_id uuid not null,
  preview_release_id uuid not null,
  preview_feedback_id uuid not null,
  revision_policy_id uuid not null,
  disposition public.evento_revision_disposition null,
  status public.evento_revision_case_status not null default 'requested',
  operator_summary_ar text null check (operator_summary_ar is null or char_length(operator_summary_ar) <= 3000),
  operator_summary_en text null check (operator_summary_en is null or char_length(operator_summary_en) <= 3000),
  counted_included_revision boolean not null default false,
  change_order_required boolean not null default false,
  triaged_by_user_id uuid null references auth.users(id) on delete restrict,
  triaged_at timestamptz null,
  authorized_by_user_id uuid null references auth.users(id) on delete restrict,
  authorized_at timestamptz null,
  resolved_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (preview_feedback_id),
  unique (id, customer_project_id, request_id, user_id),
  foreign key (preview_feedback_id, preview_release_id, customer_project_id, request_id, user_id)
    references public.project_preview_feedback(id, preview_release_id, customer_project_id, request_id, user_id) on delete restrict,
  foreign key (revision_policy_id, customer_project_id, request_id, user_id)
    references public.project_revision_policies(id, customer_project_id, request_id, user_id) on delete restrict,
  check (counted_included_revision = false or disposition = 'included_revision'),
  check (change_order_required = false or disposition = 'change_order_required')
);

-- Change orders do not invent new pricing/payment truth. They reference a separate reviewed quote/payment path.
create table if not exists public.project_change_orders (
  id uuid primary key default gen_random_uuid(),
  revision_case_id uuid not null references public.project_revision_cases(id) on delete restrict,
  customer_project_id uuid not null references public.customer_projects(id) on delete restrict,
  request_id uuid not null,
  user_id uuid not null,
  change_order_code text not null unique,
  status public.evento_change_order_status not null default 'draft',
  scope_delta jsonb not null default '[]'::jsonb check (jsonb_typeof(scope_delta) = 'array'),
  quote_id uuid null references public.quotes(id) on delete restrict,
  quote_version_id uuid null references public.quote_versions(id) on delete restrict,
  payment_order_id uuid null references public.payment_orders(id) on delete restrict,
  customer_note_ar text null check (customer_note_ar is null or char_length(customer_note_ar) <= 3000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (revision_case_id),
  check (
    (status in ('draft','rejected','cancelled'))
    or (status in ('quoted','accepted') and quote_id is not null and quote_version_id is not null)
    or (status = 'paid' and quote_id is not null and quote_version_id is not null and payment_order_id is not null)
  )
);

-- Delivery package is customer-visible acceptance evidence, but never release authority.
create table if not exists public.project_delivery_packages (
  id uuid primary key default gen_random_uuid(),
  customer_project_id uuid not null,
  request_id uuid not null,
  user_id uuid not null,
  source_preview_release_id uuid not null,
  delivery_number integer not null check (delivery_number > 0),
  version_label text not null check (char_length(version_label) between 1 and 80),
  title_ar text not null check (char_length(title_ar) between 3 and 220),
  title_en text null check (title_en is null or char_length(title_en) between 3 and 220),
  status public.evento_delivery_package_status not null default 'draft',
  deliverables_snapshot jsonb not null default '[]'::jsonb check (jsonb_typeof(deliverables_snapshot) = 'array'),
  acceptance_criteria_snapshot jsonb not null default '[]'::jsonb check (jsonb_typeof(acceptance_criteria_snapshot) = 'array'),
  support_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(support_snapshot) = 'object'),
  handoff_summary_ar text not null check (char_length(handoff_summary_ar) between 20 and 6000),
  handoff_summary_en text null check (handoff_summary_en is null or char_length(handoff_summary_en) between 20 and 6000),
  package_sha256 text not null check (package_sha256 ~ '^[0-9a-f]{64}$'),
  customer_visible boolean not null default false,
  ready_at timestamptz null,
  accepted_at timestamptz null,
  revoked_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_project_id, delivery_number),
  unique (id, customer_project_id, request_id, user_id),
  foreign key (customer_project_id, request_id, user_id)
    references public.customer_projects(id, request_id, user_id) on delete restrict,
  foreign key (source_preview_release_id, customer_project_id, request_id, user_id)
    references public.project_preview_releases(id, customer_project_id, request_id, user_id) on delete restrict,
  check (
    (status = 'ready_for_acceptance' and customer_visible = true and ready_at is not null)
    or status <> 'ready_for_acceptance'
  )
);

-- Safe handoff references only. Secrets/tokens/password values are forbidden from this table.
create table if not exists public.project_delivery_artifacts (
  id uuid primary key default gen_random_uuid(),
  delivery_package_id uuid not null references public.project_delivery_packages(id) on delete restrict,
  customer_project_id uuid not null references public.customer_projects(id) on delete restrict,
  artifact_kind text not null check (artifact_kind in ('source_bundle','documentation','app_build','design_export','deployment_reference','credential_handoff_instruction','other')),
  label_ar text not null check (char_length(label_ar) between 2 and 220),
  label_en text null check (label_en is null or char_length(label_en) between 2 and 220),
  artifact_url text null check (artifact_url is null or artifact_url ~ '^https://'),
  artifact_sha256 text null check (artifact_sha256 is null or artifact_sha256 ~ '^[0-9a-f]{64}$'),
  customer_visible boolean not null default true,
  contains_secret_value boolean not null default false check (contains_secret_value = false),
  created_at timestamptz not null default now()
);

create table if not exists public.project_delivery_acceptances (
  id uuid primary key default gen_random_uuid(),
  delivery_package_id uuid not null,
  customer_project_id uuid not null,
  request_id uuid not null,
  user_id uuid not null,
  package_sha256 text not null check (package_sha256 ~ '^[0-9a-f]{64}$'),
  accepted_at timestamptz not null default now(),
  unique (delivery_package_id, user_id),
  foreign key (delivery_package_id, customer_project_id, request_id, user_id)
    references public.project_delivery_packages(id, customer_project_id, request_id, user_id) on delete restrict
);

-- Internal release authorization is separate from delivery acceptance.
create table if not exists public.project_release_authorizations (
  id uuid primary key default gen_random_uuid(),
  delivery_package_id uuid not null references public.project_delivery_packages(id) on delete restrict,
  customer_project_id uuid not null references public.customer_projects(id) on delete restrict,
  release_type text not null check (release_type in ('production_deploy','store_submission','source_handoff','domain_handoff','other')),
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  requested_by_ref text not null check (char_length(requested_by_ref) between 2 and 180),
  decided_by_user_id uuid null references auth.users(id) on delete restrict,
  decision_note text null check (decision_note is null or char_length(decision_note) <= 4000),
  requested_at timestamptz not null default now(),
  decided_at timestamptz null,
  check (
    (status = 'pending' and decided_by_user_id is null and decided_at is null)
    or (status in ('approved','rejected') and decided_by_user_id is not null and decided_at is not null)
    or status = 'cancelled'
  )
);

create index if not exists project_revision_cases_project_status_idx on public.project_revision_cases(customer_project_id, status);
create index if not exists project_change_orders_project_status_idx on public.project_change_orders(customer_project_id, status);
create index if not exists project_delivery_packages_user_ready_idx on public.project_delivery_packages(user_id, ready_at desc);
create index if not exists project_delivery_artifacts_package_idx on public.project_delivery_artifacts(delivery_package_id, created_at);
create index if not exists project_release_authorizations_project_status_idx on public.project_release_authorizations(customer_project_id, status);

alter table public.project_revision_policies enable row level security;
alter table public.project_revision_cases enable row level security;
alter table public.project_change_orders enable row level security;
alter table public.project_delivery_packages enable row level security;
alter table public.project_delivery_artifacts enable row level security;
alter table public.project_delivery_acceptances enable row level security;
alter table public.project_release_authorizations enable row level security;

revoke all on public.project_revision_policies from anon, authenticated;
revoke all on public.project_revision_cases from anon, authenticated;
revoke all on public.project_change_orders from anon, authenticated;
revoke all on public.project_delivery_packages from anon, authenticated;
revoke all on public.project_delivery_artifacts from anon, authenticated;
revoke all on public.project_delivery_acceptances from anon, authenticated;
revoke all on public.project_release_authorizations from anon, authenticated;

grant select on public.project_revision_cases to authenticated;
grant select on public.project_change_orders to authenticated;
grant select on public.project_delivery_packages to authenticated;
grant select on public.project_delivery_artifacts to authenticated;
grant select on public.project_delivery_acceptances to authenticated;
grant insert (delivery_package_id) on public.project_delivery_acceptances to authenticated;
-- revision policy internals and release authorization never receive browser grants.

drop policy if exists project_revision_cases_select_own on public.project_revision_cases;
create policy project_revision_cases_select_own
on public.project_revision_cases for select
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
  and coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false
);

drop policy if exists project_change_orders_select_own on public.project_change_orders;
create policy project_change_orders_select_own
on public.project_change_orders for select
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
  and coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false
);

drop policy if exists project_delivery_packages_select_own_ready on public.project_delivery_packages;
create policy project_delivery_packages_select_own_ready
on public.project_delivery_packages for select
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
  and coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  and customer_visible = true
  and status in ('ready_for_acceptance','accepted')
);

drop policy if exists project_delivery_artifacts_select_own on public.project_delivery_artifacts;
create policy project_delivery_artifacts_select_own
on public.project_delivery_artifacts for select
to authenticated
using (
  customer_visible = true
  and exists (
    select 1 from public.project_delivery_packages p
    where p.id = delivery_package_id
      and p.customer_project_id = project_delivery_artifacts.customer_project_id
      and p.user_id = (select auth.uid())
      and p.customer_visible = true
      and p.status in ('ready_for_acceptance','accepted')
  )
  and coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false
);

drop policy if exists project_delivery_acceptances_select_own on public.project_delivery_acceptances;
create policy project_delivery_acceptances_select_own
on public.project_delivery_acceptances for select
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
  and coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false
);

-- Browser supplies only package id; all authoritative acceptance fields are database-owned.
create or replace function private.finalize_delivery_acceptance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_package public.project_delivery_packages%rowtype;
begin
  if v_uid is null then raise exception 'authentication_required'; end if;
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then raise exception 'permanent_account_required'; end if;

  select p.* into v_package
  from public.project_delivery_packages p
  where p.id = new.delivery_package_id
  for update;
  if not found then raise exception 'delivery_package_not_found'; end if;
  if v_package.user_id <> v_uid then raise exception 'delivery_owner_mismatch'; end if;
  if v_package.status <> 'ready_for_acceptance' or v_package.customer_visible is not true then
    raise exception 'delivery_not_ready_for_acceptance';
  end if;
  if exists (
    select 1 from public.project_revision_cases r
    where r.customer_project_id = v_package.customer_project_id
      and r.status not in ('resolved','cancelled')
  ) then raise exception 'open_revision_blocks_delivery_acceptance'; end if;
  if exists (
    select 1 from public.project_change_orders c
    where c.customer_project_id = v_package.customer_project_id
      and c.status not in ('paid','rejected','cancelled')
  ) then raise exception 'open_change_order_blocks_delivery_acceptance'; end if;
  if exists (
    select 1 from public.project_acceptance_criteria a
    where a.customer_project_id = v_package.customer_project_id
      and a.customer_visible = true
      and a.status not in ('passed','waived')
  ) then raise exception 'acceptance_criteria_not_satisfied'; end if;

  new.customer_project_id := v_package.customer_project_id;
  new.request_id := v_package.request_id;
  new.user_id := v_uid;
  new.package_sha256 := v_package.package_sha256;
  new.accepted_at := now();
  return new;
end;
$$;

revoke all on function private.finalize_delivery_acceptance() from public, anon, authenticated;

drop policy if exists project_delivery_acceptances_insert_own_ready on public.project_delivery_acceptances;
create policy project_delivery_acceptances_insert_own_ready
on public.project_delivery_acceptances for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
  and coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false
);

drop trigger if exists finalize_delivery_acceptance_before_insert on public.project_delivery_acceptances;
create trigger finalize_delivery_acceptance_before_insert
before insert on public.project_delivery_acceptances
for each row execute function private.finalize_delivery_acceptance();

create or replace function private.after_delivery_acceptance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.project_delivery_packages
  set status = 'accepted', accepted_at = new.accepted_at, updated_at = now()
  where id = new.delivery_package_id and status = 'ready_for_acceptance';

  -- Deliberately does NOT merge, deploy Production, submit stores, transfer domains, or expose credentials.
  return new;
end;
$$;

revoke all on function private.after_delivery_acceptance() from public, anon, authenticated;

drop trigger if exists after_delivery_acceptance_insert on public.project_delivery_acceptances;
create trigger after_delivery_acceptance_insert
after insert on public.project_delivery_acceptances
for each row execute function private.after_delivery_acceptance();

comment on table public.project_revision_cases is 'Gate 8 revision triage derived from exact Gate 7 feedback; customer cannot self-classify included revision or change order.';
comment on table public.project_delivery_packages is 'Customer-visible delivery package evidence. Acceptance is separate from merge, production deployment, store submission, domain transfer, or credential transfer.';
comment on table public.project_release_authorizations is 'Internal human release authorization. No browser grants; customer delivery acceptance never self-authorizes production release.';
