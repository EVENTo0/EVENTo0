-- EVENTO Gate 4 — Terms / Contract / Project Approval foundation
-- REVIEW ONLY. Do not apply directly to production.
-- Apply after Gate 0 hardening + Gate 3 quote migrations in an isolated Supabase branch/test environment.
-- This schema stores immutable customer-visible contract snapshots; it does not provide legal advice or select governing law automatically.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'evento_contract_status') then
    create type public.evento_contract_status as enum ('draft', 'sent', 'accepted', 'expired', 'withdrawn');
  end if;
end $$;

create table if not exists public.contract_agreements (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.project_requests(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  quote_id uuid not null,
  quote_version_id uuid not null,
  contract_number text not null unique,
  status public.evento_contract_status not null default 'draft',
  current_version_id uuid null,
  sent_at timestamptz null,
  accepted_at timestamptz null,
  expires_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, request_id, user_id, quote_id, quote_version_id),
  foreign key (quote_id, quote_version_id, request_id, user_id)
    references public.quote_versions(quote_id, id, request_id, user_id) on delete restrict
);

create table if not exists public.contract_versions (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null,
  request_id uuid not null,
  user_id uuid not null,
  quote_id uuid not null,
  quote_version_id uuid not null,
  version_number integer not null check (version_number > 0),
  title_ar text not null check (char_length(title_ar) between 3 and 220),
  title_en text null check (title_en is null or char_length(title_en) between 3 and 220),
  terms_version text not null check (char_length(terms_version) between 1 and 80),
  statement_of_work jsonb not null default '[]'::jsonb check (jsonb_typeof(statement_of_work) = 'array'),
  deliverables jsonb not null default '[]'::jsonb check (jsonb_typeof(deliverables) = 'array'),
  acceptance_criteria jsonb not null default '[]'::jsonb check (jsonb_typeof(acceptance_criteria) = 'array'),
  revision_policy jsonb not null default '{}'::jsonb check (jsonb_typeof(revision_policy) = 'object'),
  ip_ownership_terms jsonb not null default '{}'::jsonb check (jsonb_typeof(ip_ownership_terms) = 'object'),
  support_maintenance_terms jsonb not null default '{}'::jsonb check (jsonb_typeof(support_maintenance_terms) = 'object'),
  cancellation_refund_terms jsonb not null default '{}'::jsonb check (jsonb_typeof(cancellation_refund_terms) = 'object'),
  confidentiality_terms jsonb not null default '{}'::jsonb check (jsonb_typeof(confidentiality_terms) = 'object'),
  payment_terms_summary jsonb not null default '{}'::jsonb check (jsonb_typeof(payment_terms_summary) = 'object'),
  rendered_terms_ar text not null check (char_length(rendered_terms_ar) >= 40),
  rendered_terms_en text null check (rendered_terms_en is null or char_length(rendered_terms_en) >= 40),
  governing_law text null,
  jurisdiction_note text null,
  legal_review_status text not null default 'required' check (legal_review_status in ('required','reviewed','approved_for_use')),
  valid_until timestamptz not null,
  created_at timestamptz not null default now(),
  unique (agreement_id, version_number),
  unique (id, agreement_id, request_id, user_id, quote_id, quote_version_id),
  foreign key (agreement_id, request_id, user_id, quote_id, quote_version_id)
    references public.contract_agreements(id, request_id, user_id, quote_id, quote_version_id) on delete restrict,
  check (valid_until > created_at)
);

alter table public.contract_agreements
  add constraint contract_agreements_current_version_fkey
  foreign key (current_version_id, id, request_id, user_id, quote_id, quote_version_id)
  references public.contract_versions(id, agreement_id, request_id, user_id, quote_id, quote_version_id)
  deferrable initially deferred;

create table if not exists public.contract_acceptances (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null,
  agreement_version_id uuid not null,
  request_id uuid not null,
  user_id uuid not null,
  quote_id uuid not null,
  quote_version_id uuid not null,
  terms_version text not null,
  agreement_sha256 text not null check (agreement_sha256 ~ '^[0-9a-f]{64}$'),
  accepted_at timestamptz not null default now(),
  unique (agreement_id, user_id),
  unique (agreement_version_id, user_id),
  foreign key (agreement_version_id, agreement_id, request_id, user_id, quote_id, quote_version_id)
    references public.contract_versions(id, agreement_id, request_id, user_id, quote_id, quote_version_id) on delete restrict
);

create index if not exists contract_agreements_user_created_idx on public.contract_agreements(user_id, created_at desc);
create index if not exists contract_agreements_request_idx on public.contract_agreements(request_id);
create index if not exists contract_versions_agreement_idx on public.contract_versions(agreement_id, version_number desc);
create index if not exists contract_versions_user_idx on public.contract_versions(user_id);
create index if not exists contract_acceptances_user_idx on public.contract_acceptances(user_id, accepted_at desc);

alter table public.contract_agreements enable row level security;
alter table public.contract_versions enable row level security;
alter table public.contract_acceptances enable row level security;

revoke all on public.contract_agreements from anon, authenticated;
revoke all on public.contract_versions from anon, authenticated;
revoke all on public.contract_acceptances from anon, authenticated;

grant select on public.contract_agreements to authenticated;
grant select on public.contract_versions to authenticated;
grant select on public.contract_acceptances to authenticated;
-- The browser may only supply the version it is accepting; all authoritative columns are populated by the private trigger.
grant insert (agreement_version_id) on public.contract_acceptances to authenticated;

drop policy if exists contract_agreements_select_own_visible on public.contract_agreements;
create policy contract_agreements_select_own_visible
on public.contract_agreements for select
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
  and coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  and status in ('sent','accepted','expired','withdrawn')
);

drop policy if exists contract_versions_select_own_visible on public.contract_versions;
create policy contract_versions_select_own_visible
on public.contract_versions for select
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
  and coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  and exists (
    select 1
    from public.contract_agreements a
    where a.id = contract_versions.agreement_id
      and a.user_id = (select auth.uid())
      and a.status in ('sent','accepted','expired','withdrawn')
      and (
        a.current_version_id = contract_versions.id
        or exists (
          select 1 from public.contract_acceptances ca
          where ca.agreement_version_id = contract_versions.id
            and ca.user_id = (select auth.uid())
        )
      )
  )
);

drop policy if exists contract_acceptances_select_own on public.contract_acceptances;
create policy contract_acceptances_select_own
on public.contract_acceptances for select
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
  and coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false
);

drop policy if exists contract_acceptances_insert_own_current on public.contract_acceptances;
create policy contract_acceptances_insert_own_current
on public.contract_acceptances for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
  and coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  and exists (
    select 1
    from public.contract_agreements a
    join public.contract_versions cv on cv.id = a.current_version_id and cv.agreement_id = a.id
    join public.quotes q on q.id = a.quote_id
    join public.proposal_acceptances pa on pa.quote_version_id = a.quote_version_id and pa.user_id = a.user_id
    where a.id = contract_acceptances.agreement_id
      and a.user_id = (select auth.uid())
      and a.status = 'sent'
      and a.current_version_id = contract_acceptances.agreement_version_id
      and cv.valid_until > now()
      and (a.expires_at is null or a.expires_at > now())
      and cv.legal_review_status = 'approved_for_use'
      and q.status = 'accepted'
      and q.current_version_id = a.quote_version_id
  )
);

create or replace function private.finalize_contract_acceptance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
  v_agreement public.contract_agreements%rowtype;
  v_version public.contract_versions%rowtype;
  v_quote public.quotes%rowtype;
  v_payload text;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'authentication_required'; end if;
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'permanent_account_required';
  end if;

  select cv.* into v_version
  from public.contract_versions cv
  where cv.id = new.agreement_version_id;
  if not found then raise exception 'contract_version_not_found'; end if;

  select a.* into v_agreement
  from public.contract_agreements a
  where a.id = v_version.agreement_id
  for update;
  if not found then raise exception 'contract_not_found'; end if;

  if v_agreement.user_id <> v_uid or v_version.user_id <> v_uid then raise exception 'forbidden'; end if;
  if v_agreement.status <> 'sent' then raise exception 'contract_not_accepting'; end if;
  if v_agreement.current_version_id is distinct from v_version.id then raise exception 'contract_version_not_current'; end if;
  if v_version.valid_until <= now() or (v_agreement.expires_at is not null and v_agreement.expires_at <= now()) then
    raise exception 'contract_expired';
  end if;
  if v_version.legal_review_status <> 'approved_for_use' then raise exception 'legal_review_required'; end if;

  select q.* into v_quote
  from public.quotes q
  where q.id = v_agreement.quote_id;
  if not found or v_quote.status <> 'accepted' or v_quote.current_version_id is distinct from v_agreement.quote_version_id then
    raise exception 'accepted_quote_required';
  end if;
  if not exists (
    select 1 from public.proposal_acceptances pa
    where pa.quote_version_id = v_agreement.quote_version_id
      and pa.user_id = v_uid
  ) then
    raise exception 'quote_acceptance_evidence_required';
  end if;

  v_payload := concat_ws('|',
    v_agreement.id::text,
    v_version.id::text,
    v_agreement.request_id::text,
    v_agreement.quote_id::text,
    v_agreement.quote_version_id::text,
    v_version.version_number::text,
    v_version.terms_version,
    v_version.statement_of_work::text,
    v_version.deliverables::text,
    v_version.acceptance_criteria::text,
    v_version.revision_policy::text,
    v_version.ip_ownership_terms::text,
    v_version.support_maintenance_terms::text,
    v_version.cancellation_refund_terms::text,
    v_version.confidentiality_terms::text,
    v_version.payment_terms_summary::text,
    v_version.rendered_terms_ar,
    coalesce(v_version.rendered_terms_en, ''),
    coalesce(v_version.governing_law, ''),
    coalesce(v_version.jurisdiction_note, '')
  );

  new.agreement_id := v_agreement.id;
  new.request_id := v_agreement.request_id;
  new.user_id := v_uid;
  new.quote_id := v_agreement.quote_id;
  new.quote_version_id := v_agreement.quote_version_id;
  new.terms_version := v_version.terms_version;
  new.agreement_sha256 := encode(extensions.digest(v_payload, 'sha256'), 'hex');
  new.accepted_at := now();

  return new;
end;
$$;

create or replace function private.after_contract_acceptance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.contract_agreements
  set status = 'accepted', accepted_at = new.accepted_at, updated_at = now()
  where id = new.agreement_id;

  insert into public.project_request_events(request_id,user_id,status,note,note_ar)
  values (
    new.request_id,
    new.user_id,
    'approved',
    'Customer accepted the reviewed contract version. Payment remains a separate verified gate.',
    'وافق العميل على نسخة العقد المراجعة. يبقى الدفع بوابة مستقلة تتطلب تحققًا خادميًا.'
  );

  return new;
end;
$$;

revoke all on function private.finalize_contract_acceptance() from public, anon, authenticated;
revoke all on function private.after_contract_acceptance() from public, anon, authenticated;

drop trigger if exists contract_acceptance_finalize_before on public.contract_acceptances;
create trigger contract_acceptance_finalize_before
before insert on public.contract_acceptances
for each row execute function private.finalize_contract_acceptance();

drop trigger if exists contract_acceptance_finalize_after on public.contract_acceptances;
create trigger contract_acceptance_finalize_after
after insert on public.contract_acceptances
for each row execute function private.after_contract_acceptance();

comment on table public.contract_versions is 'Immutable customer-visible EVENTO agreement snapshots. legal_review_status must be approved_for_use before customer acceptance.';
comment on table public.contract_acceptances is 'Append-only acceptance evidence. Browser role may supply only agreement_version_id; authoritative fields and SHA-256 are populated by a private trigger.';
comment on function private.finalize_contract_acceptance() is 'Private trigger-only contract validation/hash function; not exposed as a customer RPC.';
