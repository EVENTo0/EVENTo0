-- EVENTO Gate 3 — Quote / Pricing / Proposal foundation
-- REVIEW ONLY. Do not apply directly to production.
-- Apply to an isolated Supabase branch/test environment first and run negative authorization tests.

create extension if not exists pgcrypto with schema extensions;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'evento_quote_status') then
    create type public.evento_quote_status as enum ('draft', 'sent', 'accepted', 'expired', 'withdrawn');
  end if;
end $$;

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null,
  user_id uuid not null references auth.users(id) on delete restrict,
  quote_number text not null unique,
  status public.evento_quote_status not null default 'draft',
  currency text not null default 'AED' check (currency = 'AED'),
  current_version_id uuid null,
  sent_at timestamptz null,
  accepted_at timestamptz null,
  expires_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, request_id, user_id),
  foreign key (request_id, user_id)
    references public.project_requests(id, user_id) on delete restrict
);

create table if not exists public.quote_versions (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete restrict,
  request_id uuid not null,
  user_id uuid not null,
  version_number integer not null check (version_number > 0),
  title text not null check (char_length(title) between 3 and 180),
  summary text null check (summary is null or char_length(summary) <= 5000),
  scope_snapshot jsonb not null default '[]'::jsonb check (jsonb_typeof(scope_snapshot) = 'array'),
  subtotal_aed numeric(14,2) not null check (subtotal_aed >= 0),
  discount_aed numeric(14,2) not null default 0 check (discount_aed >= 0),
  tax_aed numeric(14,2) not null default 0 check (tax_aed >= 0),
  total_aed numeric(14,2) generated always as (subtotal_aed - discount_aed + tax_aed) stored,
  valid_until timestamptz not null,
  terms_version text not null check (char_length(terms_version) between 1 and 80),
  customer_note text null check (customer_note is null or char_length(customer_note) <= 5000),
  created_at timestamptz not null default now(),
  unique (quote_id, version_number),
  unique (id, quote_id),
  unique (id, quote_id, request_id, user_id),
  foreign key (quote_id, request_id, user_id)
    references public.quotes(id, request_id, user_id) on delete restrict,
  check (discount_aed <= subtotal_aed),
  check (valid_until > created_at)
);

-- Composite FK prevents a quote from pointing at another quote's version.
alter table public.quotes
  add constraint quotes_current_version_fkey
  foreign key (current_version_id, id)
  references public.quote_versions(id, quote_id)
  deferrable initially deferred;

create table if not exists public.quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_version_id uuid not null references public.quote_versions(id) on delete restrict,
  position integer not null check (position > 0),
  category text not null check (category in ('discovery','design','build','integration','deployment','support','addon','other')),
  title text not null check (char_length(title) between 2 and 180),
  description text null check (description is null or char_length(description) <= 3000),
  quantity numeric(12,2) not null default 1 check (quantity > 0),
  unit_price_aed numeric(14,2) not null check (unit_price_aed >= 0),
  line_total_aed numeric(14,2) generated always as (quantity * unit_price_aed) stored,
  created_at timestamptz not null default now(),
  unique (quote_version_id, position)
);

-- Internal economics are intentionally separated from customer-readable quote tables.
create table if not exists public.quote_version_economics (
  quote_version_id uuid primary key references public.quote_versions(id) on delete restrict,
  expected_variable_cost_aed numeric(14,2) not null default 0 check (expected_variable_cost_aed >= 0),
  expected_gross_margin_aed numeric(14,2) not null,
  expected_gross_margin_percent numeric(7,4) null,
  cost_assumptions jsonb not null default '{}'::jsonb check (jsonb_typeof(cost_assumptions) = 'object'),
  updated_at timestamptz not null default now()
);

create table if not exists public.pricing_rules (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  rule_type text not null check (rule_type in ('fixed','percent','range','manual')),
  configuration jsonb not null default '{}'::jsonb check (jsonb_typeof(configuration) = 'object'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.proposal_acceptances (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null,
  quote_version_id uuid not null,
  request_id uuid not null,
  user_id uuid not null references auth.users(id) on delete restrict,
  quote_sha256 text not null check (quote_sha256 ~ '^[0-9a-f]{64}$'),
  terms_version text not null,
  accepted_at timestamptz not null default now(),
  unique (quote_version_id, user_id),
  foreign key (quote_version_id, quote_id, request_id, user_id)
    references public.quote_versions(id, quote_id, request_id, user_id) on delete restrict
);

create index if not exists quotes_user_created_idx on public.quotes(user_id, created_at desc);
create index if not exists quotes_request_idx on public.quotes(request_id);
create index if not exists quote_versions_quote_idx on public.quote_versions(quote_id, version_number desc);
create index if not exists quote_versions_user_idx on public.quote_versions(user_id);
create index if not exists quote_items_version_idx on public.quote_items(quote_version_id, position);
create index if not exists proposal_acceptances_user_idx on public.proposal_acceptances(user_id, accepted_at desc);

alter table public.quotes enable row level security;
alter table public.quote_versions enable row level security;
alter table public.quote_items enable row level security;
alter table public.quote_version_economics enable row level security;
alter table public.pricing_rules enable row level security;
alter table public.proposal_acceptances enable row level security;

revoke all on public.quotes from anon, authenticated;
revoke all on public.quote_versions from anon, authenticated;
revoke all on public.quote_items from anon, authenticated;
revoke all on public.quote_version_economics from anon, authenticated;
revoke all on public.pricing_rules from anon, authenticated;
revoke all on public.proposal_acceptances from anon, authenticated;

grant select on public.quotes to authenticated;
grant select on public.quote_versions to authenticated;
grant select on public.quote_items to authenticated;
grant select on public.proposal_acceptances to authenticated;

-- Internal economics/pricing rules deliberately receive no authenticated grants.

drop policy if exists quotes_select_own_visible on public.quotes;
create policy quotes_select_own_visible
on public.quotes for select
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
  and coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  and status in ('sent','accepted','expired','withdrawn')
);

drop policy if exists quote_versions_select_own_visible on public.quote_versions;
create policy quote_versions_select_own_visible
on public.quote_versions for select
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
  and coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  and exists (
    select 1
    from public.quotes q
    where q.id = quote_versions.quote_id
      and q.user_id = (select auth.uid())
      and q.status in ('sent','accepted','expired','withdrawn')
  )
);

drop policy if exists quote_items_select_own_visible on public.quote_items;
create policy quote_items_select_own_visible
on public.quote_items for select
to authenticated
using (
  exists (
    select 1
    from public.quote_versions qv
    join public.quotes q on q.id = qv.quote_id
    where qv.id = quote_items.quote_version_id
      and q.user_id = (select auth.uid())
      and q.status in ('sent','accepted','expired','withdrawn')
      and coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  )
);

drop policy if exists proposal_acceptances_select_own on public.proposal_acceptances;
create policy proposal_acceptances_select_own
on public.proposal_acceptances for select
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
  and coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false
);

-- Customer acceptance is a narrow RPC; customers never UPDATE quote prices/status directly.
create or replace function public.accept_quote_version(p_quote_version_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
  v_quote public.quotes%rowtype;
  v_version public.quote_versions%rowtype;
  v_workflow_stage text;
  v_acceptance_id uuid;
  v_quote_payload text;
  v_hash text;
  v_items_total numeric(14,2);
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'authentication_required'; end if;
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'permanent_account_required';
  end if;

  select qv.* into v_version
  from public.quote_versions qv
  where qv.id = p_quote_version_id;
  if not found then raise exception 'quote_version_not_found'; end if;

  select q.* into v_quote
  from public.quotes q
  where q.id = v_version.quote_id
  for update;

  if v_quote.user_id <> v_uid or v_version.user_id <> v_uid then raise exception 'forbidden'; end if;
  if v_quote.request_id <> v_version.request_id then raise exception 'quote_request_mismatch'; end if;
  if v_quote.status <> 'sent' then raise exception 'quote_not_accepting'; end if;
  if v_quote.current_version_id is distinct from v_version.id then raise exception 'quote_version_not_current'; end if;
  if v_version.valid_until <= now() or (v_quote.expires_at is not null and v_quote.expires_at <= now()) then
    raise exception 'quote_expired';
  end if;

  select coalesce(sum(qi.line_total_aed), 0)::numeric(14,2) into v_items_total
  from public.quote_items qi
  where qi.quote_version_id = v_version.id;
  if v_items_total <> v_version.subtotal_aed then raise exception 'quote_totals_invalid'; end if;

  select pw.current_stage into v_workflow_stage
  from public.project_workflows pw
  where pw.request_id = v_quote.request_id
    and pw.user_id = v_uid;
  if v_workflow_stage is distinct from 'scope_approved' then
    raise exception 'scope_not_approved';
  end if;

  v_quote_payload := concat_ws('|',
    v_quote.id::text,
    v_version.id::text,
    v_version.version_number::text,
    v_quote.currency,
    v_version.subtotal_aed::text,
    v_version.discount_aed::text,
    v_version.tax_aed::text,
    v_version.total_aed::text,
    v_version.valid_until::text,
    v_version.terms_version,
    v_version.scope_snapshot::text
  );
  v_hash := encode(extensions.digest(v_quote_payload, 'sha256'), 'hex');

  insert into public.proposal_acceptances(
    quote_id, quote_version_id, request_id, user_id, quote_sha256, terms_version
  ) values (
    v_quote.id, v_version.id, v_quote.request_id, v_uid, v_hash, v_version.terms_version
  )
  returning id into v_acceptance_id;

  update public.quotes
  set status = 'accepted', accepted_at = now(), updated_at = now()
  where id = v_quote.id;

  insert into public.project_request_events(request_id,user_id,status,note,note_ar)
  values (
    v_quote.request_id,
    v_uid,
    'quoted',
    'Customer accepted quote version ' || v_version.version_number || '. Payment remains a separate verified gate.',
    'وافق العميل على نسخة عرض السعر رقم ' || v_version.version_number || '. يبقى الدفع بوابة مستقلة تتطلب تحققًا خادميًا.'
  );

  return v_acceptance_id;
end;
$$;

revoke all on function public.accept_quote_version(uuid) from public, anon;
grant execute on function public.accept_quote_version(uuid) to authenticated;

comment on table public.quote_version_economics is 'Internal EVENTO economics. Never grant customer/browser roles access.';
comment on table public.pricing_rules is 'Internal EVENTO pricing configuration. No customer/browser grants.';
comment on function public.accept_quote_version(uuid) is 'Accepts only the exact current, totals-consistent, non-expired quote version owned by a permanent authenticated customer after scope approval.';
