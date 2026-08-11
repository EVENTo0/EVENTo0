-- EVENTO Gate 5 — Provider-neutral verified payment ledger
-- REVIEW ONLY. Do not apply directly to production.
-- Apply after Gate 0 hardening, Gate 3 quotes and Gate 4 contracts in an isolated Supabase branch/test environment.
-- Browser redirects are never authoritative payment proof. Only normalized server-side provider events with verified signatures may move an order to paid.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'evento_payment_order_status') then
    create type public.evento_payment_order_status as enum ('pending','requires_action','paid','failed','cancelled','partially_refunded','refunded');
  end if;
  if not exists (select 1 from pg_type where typname = 'evento_payment_attempt_status') then
    create type public.evento_payment_attempt_status as enum ('created','pending','requires_action','succeeded','failed','cancelled');
  end if;
  if not exists (select 1 from pg_type where typname = 'evento_refund_status') then
    create type public.evento_refund_status as enum ('pending','succeeded','failed','cancelled');
  end if;
end $$;

alter table public.contract_acceptances
  add constraint contract_acceptances_binding_unique
  unique (id, agreement_id, agreement_version_id, request_id, user_id, quote_id, quote_version_id);

create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null,
  user_id uuid not null,
  quote_id uuid not null,
  quote_version_id uuid not null,
  agreement_id uuid not null,
  agreement_version_id uuid not null,
  contract_acceptance_id uuid not null,
  order_number text not null unique,
  payment_kind text not null default 'full' check (payment_kind in ('full','deposit','milestone')),
  milestone_label text null check (milestone_label is null or char_length(milestone_label) <= 180),
  installment_sequence integer not null default 1 check (installment_sequence > 0),
  currency text not null default 'AED' check (currency = 'AED'),
  amount_due_aed numeric(14,2) not null check (amount_due_aed > 0),
  amount_paid_aed numeric(14,2) not null default 0 check (amount_paid_aed >= 0),
  amount_refunded_aed numeric(14,2) not null default 0 check (amount_refunded_aed >= 0),
  status public.evento_payment_order_status not null default 'pending',
  current_attempt_id uuid null,
  due_at timestamptz null,
  paid_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, request_id, user_id),
  foreign key (contract_acceptance_id, agreement_id, agreement_version_id, request_id, user_id, quote_id, quote_version_id)
    references public.contract_acceptances(id, agreement_id, agreement_version_id, request_id, user_id, quote_id, quote_version_id) on delete restrict,
  check (amount_refunded_aed <= amount_paid_aed),
  check (amount_paid_aed <= amount_due_aed)
);

create table if not exists public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  payment_order_id uuid not null,
  request_id uuid not null,
  user_id uuid not null,
  provider text not null check (provider in ('stripe','tap')),
  status public.evento_payment_attempt_status not null default 'created',
  currency text not null default 'AED' check (currency = 'AED'),
  amount_requested_aed numeric(14,2) not null check (amount_requested_aed > 0),
  expires_at timestamptz null,
  completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, payment_order_id, request_id, user_id),
  foreign key (payment_order_id, request_id, user_id)
    references public.payment_orders(id, request_id, user_id) on delete restrict
);

alter table public.payment_orders
  add constraint payment_orders_current_attempt_fkey
  foreign key (current_attempt_id, id, request_id, user_id)
  references public.payment_attempts(id, payment_order_id, request_id, user_id)
  deferrable initially deferred;

-- Provider-specific identifiers and idempotency data are internal only.
create table if not exists public.payment_provider_attempt_details (
  payment_attempt_id uuid primary key references public.payment_attempts(id) on delete restrict,
  provider_session_id text null,
  provider_payment_id text null,
  idempotency_key_sha256 text not null check (idempotency_key_sha256 ~ '^[0-9a-f]{64}$'),
  integration_version text not null,
  created_at timestamptz not null default now(),
  unique (provider_session_id),
  unique (provider_payment_id)
);

-- Raw/normalized provider events are internal audit records; no browser grants.
create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_order_id uuid not null references public.payment_orders(id) on delete restrict,
  payment_attempt_id uuid null references public.payment_attempts(id) on delete restrict,
  provider text not null check (provider in ('stripe','tap')),
  provider_event_id text not null,
  event_kind text not null check (event_kind in ('checkout_created','payment_pending','payment_requires_action','payment_succeeded','payment_failed','payment_cancelled','refund_pending','refund_succeeded','refund_failed')),
  currency text not null default 'AED' check (currency = 'AED'),
  amount_aed numeric(14,2) not null default 0 check (amount_aed >= 0),
  signature_verified boolean not null default false,
  payload_sha256 text not null check (payload_sha256 ~ '^[0-9a-f]{64}$'),
  provider_object_id text null,
  provider_created_at timestamptz null,
  received_at timestamptz not null default now(),
  processed_at timestamptz null,
  unique (provider, provider_event_id)
);

create table if not exists public.refunds (
  id uuid primary key default gen_random_uuid(),
  payment_order_id uuid not null,
  request_id uuid not null,
  user_id uuid not null,
  amount_aed numeric(14,2) not null check (amount_aed > 0),
  currency text not null default 'AED' check (currency = 'AED'),
  status public.evento_refund_status not null default 'pending',
  reason_code text null check (reason_code is null or char_length(reason_code) <= 80),
  created_at timestamptz not null default now(),
  completed_at timestamptz null,
  unique (id, payment_order_id, request_id, user_id),
  foreign key (payment_order_id, request_id, user_id)
    references public.payment_orders(id, request_id, user_id) on delete restrict
);

create table if not exists public.payment_provider_refund_details (
  refund_id uuid primary key references public.refunds(id) on delete restrict,
  provider text not null check (provider in ('stripe','tap')),
  provider_refund_id text not null,
  idempotency_key_sha256 text not null check (idempotency_key_sha256 ~ '^[0-9a-f]{64}$'),
  unique (provider, provider_refund_id)
);

create index if not exists payment_orders_user_created_idx on public.payment_orders(user_id, created_at desc);
create index if not exists payment_orders_request_idx on public.payment_orders(request_id);
create index if not exists payment_attempts_order_created_idx on public.payment_attempts(payment_order_id, created_at desc);
create index if not exists payment_attempts_user_idx on public.payment_attempts(user_id);
create index if not exists payment_events_order_received_idx on public.payment_events(payment_order_id, received_at desc);
create index if not exists refunds_user_created_idx on public.refunds(user_id, created_at desc);

alter table public.payment_orders enable row level security;
alter table public.payment_attempts enable row level security;
alter table public.payment_provider_attempt_details enable row level security;
alter table public.payment_events enable row level security;
alter table public.refunds enable row level security;
alter table public.payment_provider_refund_details enable row level security;

revoke all on public.payment_orders from anon, authenticated;
revoke all on public.payment_attempts from anon, authenticated;
revoke all on public.payment_provider_attempt_details from anon, authenticated;
revoke all on public.payment_events from anon, authenticated;
revoke all on public.refunds from anon, authenticated;
revoke all on public.payment_provider_refund_details from anon, authenticated;

grant select on public.payment_orders to authenticated;
grant select on public.payment_attempts to authenticated;
grant select on public.refunds to authenticated;
-- Provider IDs, webhook events and idempotency material deliberately receive no authenticated grants.

drop policy if exists payment_orders_select_own on public.payment_orders;
create policy payment_orders_select_own
on public.payment_orders for select
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
  and coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false
);

drop policy if exists payment_attempts_select_own on public.payment_attempts;
create policy payment_attempts_select_own
on public.payment_attempts for select
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
  and coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false
);

drop policy if exists refunds_select_own on public.refunds;
create policy refunds_select_own
on public.refunds for select
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
  and coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false
);

create or replace function private.apply_verified_payment_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.payment_orders%rowtype;
  v_attempt public.payment_attempts%rowtype;
  v_new_refunded numeric(14,2);
begin
  select po.* into v_order
  from public.payment_orders po
  where po.id = new.payment_order_id
  for update;
  if not found then raise exception 'payment_order_not_found'; end if;

  if new.payment_attempt_id is not null then
    select pa.* into v_attempt
    from public.payment_attempts pa
    where pa.id = new.payment_attempt_id;
    if not found then raise exception 'payment_attempt_not_found'; end if;
    if v_attempt.payment_order_id <> v_order.id then raise exception 'attempt_order_mismatch'; end if;
    if v_attempt.provider <> new.provider then raise exception 'provider_mismatch'; end if;
    if v_attempt.currency <> new.currency then raise exception 'currency_mismatch'; end if;
  end if;

  -- Store unverified events for forensic evidence if the server chooses, but they may never change financial state.
  if new.signature_verified is not true then
    return new;
  end if;

  if new.currency <> v_order.currency then raise exception 'currency_mismatch'; end if;

  if new.event_kind = 'payment_succeeded' then
    if new.payment_attempt_id is null then raise exception 'attempt_required'; end if;
    if new.amount_aed <> v_order.amount_due_aed or v_attempt.amount_requested_aed <> v_order.amount_due_aed then
      raise exception 'amount_mismatch';
    end if;
    if not exists (
      select 1 from public.contract_acceptances ca
      where ca.id = v_order.contract_acceptance_id
        and ca.user_id = v_order.user_id
        and ca.request_id = v_order.request_id
    ) then
      raise exception 'accepted_contract_required';
    end if;

    update public.payment_attempts
    set status = 'succeeded', completed_at = coalesce(new.provider_created_at, now()), updated_at = now()
    where id = new.payment_attempt_id;

    update public.payment_orders
    set status = 'paid', amount_paid_aed = amount_due_aed, paid_at = coalesce(new.provider_created_at, now()), updated_at = now()
    where id = v_order.id and status <> 'paid';

    insert into public.project_request_events(request_id,user_id,status,note,note_ar)
    select
      v_order.request_id,
      v_order.user_id,
      'approved',
      'Verified payment recorded for order ' || v_order.order_number || '. Fulfillment may proceed only through the next controlled gate.',
      'تم تسجيل دفع موثّق للطلب ' || v_order.order_number || '. لا يبدأ التنفيذ إلا عبر البوابة التشغيلية التالية.'
    where not exists (
      select 1 from public.project_request_events e
      where e.request_id = v_order.request_id
        and e.note = 'Verified payment recorded for order ' || v_order.order_number || '. Fulfillment may proceed only through the next controlled gate.'
    );

  elsif new.event_kind = 'payment_failed' then
    if new.payment_attempt_id is not null then
      update public.payment_attempts set status = 'failed', completed_at = coalesce(new.provider_created_at, now()), updated_at = now() where id = new.payment_attempt_id and status <> 'succeeded';
    end if;
    update public.payment_orders set status = 'failed', updated_at = now() where id = v_order.id and status not in ('paid','partially_refunded','refunded');

  elsif new.event_kind = 'payment_cancelled' then
    if new.payment_attempt_id is not null then
      update public.payment_attempts set status = 'cancelled', completed_at = coalesce(new.provider_created_at, now()), updated_at = now() where id = new.payment_attempt_id and status <> 'succeeded';
    end if;
    update public.payment_orders set status = 'cancelled', updated_at = now() where id = v_order.id and status not in ('paid','partially_refunded','refunded');

  elsif new.event_kind = 'payment_pending' then
    if new.payment_attempt_id is not null then update public.payment_attempts set status = 'pending', updated_at = now() where id = new.payment_attempt_id and status not in ('succeeded','failed','cancelled'); end if;

  elsif new.event_kind = 'payment_requires_action' then
    if new.payment_attempt_id is not null then update public.payment_attempts set status = 'requires_action', updated_at = now() where id = new.payment_attempt_id and status not in ('succeeded','failed','cancelled'); end if;
    update public.payment_orders set status = 'requires_action', updated_at = now() where id = v_order.id and status in ('pending','requires_action','failed');

  elsif new.event_kind = 'refund_succeeded' then
    if v_order.amount_paid_aed <= 0 then raise exception 'paid_order_required_for_refund'; end if;
    if new.amount_aed <= 0 then raise exception 'refund_amount_required'; end if;
    v_new_refunded := v_order.amount_refunded_aed + new.amount_aed;
    if v_new_refunded > v_order.amount_paid_aed then raise exception 'refund_exceeds_paid_amount'; end if;

    update public.payment_orders
    set amount_refunded_aed = v_new_refunded,
        status = case when v_new_refunded = amount_paid_aed then 'refunded'::public.evento_payment_order_status else 'partially_refunded'::public.evento_payment_order_status end,
        updated_at = now()
    where id = v_order.id;
  end if;

  new.processed_at := now();
  return new;
end;
$$;

revoke all on function private.apply_verified_payment_event() from public, anon, authenticated;

drop trigger if exists payment_event_apply_verified_before on public.payment_events;
create trigger payment_event_apply_verified_before
before insert on public.payment_events
for each row execute function private.apply_verified_payment_event();

comment on table public.payment_events is 'Internal append-only provider-event ledger. signature_verified must be true before the private trigger may mutate payment state.';
comment on table public.payment_provider_attempt_details is 'Internal provider identifiers/idempotency material. Never expose to browser/mobile customer roles.';
comment on function private.apply_verified_payment_event() is 'Private trigger-only normalized payment state transition function. Browser redirects cannot call it or mark orders paid.';
