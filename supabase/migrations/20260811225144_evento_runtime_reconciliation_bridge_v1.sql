-- EVENTO Runtime Reconciliation Bridge v1
-- Proven first on Supabase development branch zgyovnqjmaognsjyylvk.
-- Additive over the live project_quotes/project_payments/project_build_queue model.
-- Do not apply to Production until PR review, CI, branch smoke, RLS/advisor review and owner authorization are complete.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.project_quote_versions (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.project_quotes(id) on delete restrict,
  request_id uuid not null references public.project_requests(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  version_number integer not null check (version_number > 0),
  currency text not null default 'AED' check (currency='AED'),
  subtotal_aed numeric(12,2) not null check (subtotal_aed >= 0),
  discount_aed numeric(12,2) not null default 0 check (discount_aed >= 0),
  tax_aed numeric(12,2) not null default 0 check (tax_aed >= 0),
  total_aed numeric(12,2) not null check (total_aed >= 0),
  pricing_breakdown jsonb not null default '[]'::jsonb,
  scope_snapshot jsonb not null default '{}'::jsonb,
  valid_until timestamptz,
  quote_sha256 text not null check (quote_sha256 ~ '^[0-9a-f]{64}$'),
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (quote_id, version_number),
  unique (id, quote_id, request_id, user_id)
);

create table if not exists public.project_quote_acceptances (
  id uuid primary key default gen_random_uuid(),
  quote_version_id uuid not null unique,
  quote_id uuid not null,
  request_id uuid not null,
  user_id uuid not null,
  quote_sha256 text not null check (quote_sha256 ~ '^[0-9a-f]{64}$'),
  accepted_at timestamptz not null default now(),
  foreign key (quote_version_id, quote_id, request_id, user_id)
    references public.project_quote_versions(id, quote_id, request_id, user_id) on delete restrict
);

create table if not exists public.project_contract_versions (
  id uuid primary key default gen_random_uuid(),
  contract_code text not null unique default ((('EVC-' || to_char(now(),'YYMMDD')) || '-') || upper(substr(replace(gen_random_uuid()::text,'-',''),1,6))),
  request_id uuid not null references public.project_requests(id) on delete restrict,
  quote_id uuid not null references public.project_quotes(id) on delete restrict,
  quote_version_id uuid not null,
  user_id uuid not null references auth.users(id) on delete restrict,
  version_number integer not null check (version_number > 0),
  status text not null default 'draft' check (status in ('draft','sent','accepted','expired','withdrawn')),
  terms_version text not null check (char_length(terms_version) between 1 and 80),
  statement_of_work jsonb not null default '[]'::jsonb check (jsonb_typeof(statement_of_work)='array'),
  deliverables jsonb not null default '[]'::jsonb check (jsonb_typeof(deliverables)='array'),
  acceptance_criteria jsonb not null default '[]'::jsonb check (jsonb_typeof(acceptance_criteria)='array'),
  revision_policy jsonb not null default '{}'::jsonb check (jsonb_typeof(revision_policy)='object'),
  support_terms jsonb not null default '{}'::jsonb check (jsonb_typeof(support_terms)='object'),
  payment_terms jsonb not null default '{}'::jsonb check (jsonb_typeof(payment_terms)='object'),
  rendered_terms_ar text not null check (char_length(rendered_terms_ar) >= 40),
  rendered_terms_en text,
  legal_review_status text not null default 'required' check (legal_review_status in ('required','reviewed','approved_for_use')),
  valid_until timestamptz not null,
  contract_sha256 text not null check (contract_sha256 ~ '^[0-9a-f]{64}$'),
  sent_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (quote_id, version_number),
  unique (id, request_id, quote_id, quote_version_id, user_id),
  foreign key (quote_version_id, quote_id, request_id, user_id)
    references public.project_quote_versions(id, quote_id, request_id, user_id) on delete restrict,
  check (valid_until > created_at)
);

create table if not exists public.project_contract_acceptances (
  id uuid primary key default gen_random_uuid(),
  contract_version_id uuid not null unique,
  request_id uuid not null,
  quote_id uuid not null,
  quote_version_id uuid not null,
  user_id uuid not null,
  contract_sha256 text not null check (contract_sha256 ~ '^[0-9a-f]{64}$'),
  accepted_at timestamptz not null default now(),
  foreign key (contract_version_id, request_id, quote_id, quote_version_id, user_id)
    references public.project_contract_versions(id, request_id, quote_id, quote_version_id, user_id) on delete restrict
);

create table if not exists public.project_fulfillment_authorizations (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null unique references public.project_payments(id) on delete restrict,
  request_id uuid not null references public.project_requests(id) on delete restrict,
  quote_id uuid not null references public.project_quotes(id) on delete restrict,
  contract_acceptance_id uuid not null references public.project_contract_acceptances(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  authorized_by_user_id uuid not null references auth.users(id) on delete restrict,
  owner_review_note text not null check (char_length(owner_review_note) between 10 and 3000),
  authorized_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists project_quote_versions_quote_idx on public.project_quote_versions(quote_id,version_number desc);
create index if not exists project_contract_versions_quote_idx on public.project_contract_versions(quote_id,version_number desc);
create index if not exists project_contract_versions_user_idx on public.project_contract_versions(user_id,created_at desc);
create index if not exists project_fulfillment_authorizations_request_idx on public.project_fulfillment_authorizations(request_id,authorized_at desc);
create index if not exists project_build_queue_quote_id_idx on public.project_build_queue(quote_id);

alter table public.project_quote_versions enable row level security;
alter table public.project_quote_acceptances enable row level security;
alter table public.project_contract_versions enable row level security;
alter table public.project_contract_acceptances enable row level security;
alter table public.project_fulfillment_authorizations enable row level security;

revoke all on public.project_quote_versions from anon, authenticated;
revoke all on public.project_quote_acceptances from anon, authenticated;
revoke all on public.project_contract_versions from anon, authenticated;
revoke all on public.project_contract_acceptances from anon, authenticated;
revoke all on public.project_fulfillment_authorizations from anon, authenticated;
grant select on public.project_quote_versions, public.project_quote_acceptances, public.project_contract_versions, public.project_contract_acceptances to authenticated;
grant all on public.project_quote_versions, public.project_quote_acceptances, public.project_contract_versions, public.project_contract_acceptances, public.project_fulfillment_authorizations to service_role;

create policy project_quote_versions_select_access on public.project_quote_versions for select to authenticated
using (((select auth.uid()) is not null) and coalesce((select (auth.jwt()->>'is_anonymous')::boolean),true)=false and ((select auth.uid())=user_id or (select private.is_evento_staff())));
create policy project_quote_acceptances_select_access on public.project_quote_acceptances for select to authenticated
using (((select auth.uid()) is not null) and coalesce((select (auth.jwt()->>'is_anonymous')::boolean),true)=false and ((select auth.uid())=user_id or (select private.is_evento_staff())));
create policy project_contract_versions_select_access on public.project_contract_versions for select to authenticated
using (((select auth.uid()) is not null) and coalesce((select (auth.jwt()->>'is_anonymous')::boolean),true)=false and ((select auth.uid())=user_id or (select private.is_evento_staff())) and status in ('sent','accepted','expired','withdrawn'));
create policy project_contract_acceptances_select_access on public.project_contract_acceptances for select to authenticated
using (((select auth.uid()) is not null) and coalesce((select (auth.jwt()->>'is_anonymous')::boolean),true)=false and ((select auth.uid())=user_id or (select private.is_evento_staff())));

create or replace function public.evento_send_quote_v1(p_actor_user_id uuid,p_quote_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_quote public.project_quotes%rowtype; v_version integer; v_hash text; v_version_id uuid;
begin
  if not exists (select 1 from private.evento_company_memberships m where m.user_id=p_actor_user_id and m.active=true and m.role in ('owner','admin','ops','finance')) then raise exception 'staff_permission_required'; end if;
  select * into v_quote from public.project_quotes where id=p_quote_id for update;
  if v_quote.id is null then raise exception 'quote_not_found'; end if;
  if v_quote.status <> 'draft' then raise exception 'quote_not_sendable'; end if;
  select coalesce(max(version_number),0)+1 into v_version from public.project_quote_versions where quote_id=v_quote.id;
  v_hash := encode(extensions.digest(concat_ws('|',v_quote.id::text,v_quote.request_id::text,v_quote.user_id::text,v_version::text,v_quote.currency,v_quote.subtotal_aed::text,v_quote.discount_aed::text,v_quote.tax_aed::text,v_quote.total_aed::text,v_quote.pricing_breakdown::text,v_quote.scope_snapshot::text,coalesce(v_quote.valid_until::text,'')),'sha256'),'hex');
  insert into public.project_quote_versions(quote_id,request_id,user_id,version_number,currency,subtotal_aed,discount_aed,tax_aed,total_aed,pricing_breakdown,scope_snapshot,valid_until,quote_sha256,sent_at)
  values(v_quote.id,v_quote.request_id,v_quote.user_id,v_version,v_quote.currency,v_quote.subtotal_aed,v_quote.discount_aed,v_quote.tax_aed,v_quote.total_aed,v_quote.pricing_breakdown,v_quote.scope_snapshot,v_quote.valid_until,v_hash,now()) returning id into v_version_id;
  update public.project_quotes set status='sent',sent_at=now(),updated_at=now() where id=p_quote_id;
  update public.project_requests set status='quoted',updated_at=now() where id=v_quote.request_id;
  update public.project_workflows set current_stage='quote_sent',progress_percent=40,estimated_price_aed=v_quote.total_aed,updated_at=now() where request_id=v_quote.request_id;
  insert into public.project_request_events(request_id,user_id,status,note,note_ar) values(v_quote.request_id,v_quote.user_id,'quoted','EVENTO sent an immutable quote version for customer review.','أرسلت EVENTO نسخة ثابتة من عرض السعر لمراجعة العميل.');
  return jsonb_build_object('quote_id',v_quote.id,'quote_version_id',v_version_id,'version_number',v_version,'status','sent','total_aed',v_quote.total_aed,'quote_sha256',v_hash);
end; $$;

create or replace function public.evento_accept_quote_v1(p_user_id uuid,p_quote_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_quote public.project_quotes%rowtype; v_is_anonymous boolean; v_version public.project_quote_versions%rowtype; v_acceptance_id uuid;
begin
  select is_anonymous into v_is_anonymous from auth.users where id=p_user_id;
  if v_is_anonymous is null then raise exception 'user_not_found'; end if;
  if v_is_anonymous then raise exception 'verified_account_required'; end if;
  select * into v_quote from public.project_quotes where id=p_quote_id for update;
  if v_quote.id is null then raise exception 'quote_not_found'; end if;
  if v_quote.user_id <> p_user_id then raise exception 'forbidden'; end if;
  if v_quote.status <> 'sent' then raise exception 'quote_not_acceptable'; end if;
  if v_quote.valid_until is not null and v_quote.valid_until < now() then update public.project_quotes set status='expired',updated_at=now() where id=p_quote_id; raise exception 'quote_expired'; end if;
  select * into v_version from public.project_quote_versions where quote_id=v_quote.id order by version_number desc limit 1;
  if v_version.id is null then raise exception 'quote_version_required'; end if;
  insert into public.project_quote_acceptances(quote_version_id,quote_id,request_id,user_id,quote_sha256,accepted_at)
  values(v_version.id,v_quote.id,v_quote.request_id,p_user_id,v_version.quote_sha256,now()) returning id into v_acceptance_id;
  update public.project_quotes set status='accepted',accepted_at=now(),updated_at=now() where id=p_quote_id;
  update public.project_requests set status='approved',updated_at=now() where id=v_quote.request_id;
  update public.project_workflows set current_stage='quote_approved',progress_percent=45,estimated_price_aed=v_quote.total_aed,updated_at=now() where request_id=v_quote.request_id;
  insert into public.project_build_queue(request_id,user_id,quote_id,status) values(v_quote.request_id,v_quote.user_id,v_quote.id,'pending_payment') on conflict(request_id) do update set quote_id=excluded.quote_id,status=case when public.project_build_queue.status='cancelled' then 'pending_payment' else public.project_build_queue.status end,updated_at=now();
  insert into public.project_request_events(request_id,user_id,status,note,note_ar) values(v_quote.request_id,v_quote.user_id,'approved','Customer accepted the immutable quote version. Contract acceptance is the next gate.','وافق العميل على نسخة عرض السعر الثابتة. قبول العقد هو البوابة التالية.');
  return jsonb_build_object('quote_id',v_quote.id,'quote_version_id',v_version.id,'acceptance_id',v_acceptance_id,'status','accepted','next_gate','contract','build_queue_status','pending_payment');
end; $$;

create or replace function public.evento_create_contract_draft_v1(p_actor_user_id uuid,p_quote_id uuid,p_terms_version text,p_statement_of_work jsonb,p_deliverables jsonb,p_acceptance_criteria jsonb,p_revision_policy jsonb,p_support_terms jsonb,p_payment_terms jsonb,p_rendered_terms_ar text,p_rendered_terms_en text,p_legal_review_status text,p_valid_until timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_quote public.project_quotes%rowtype; v_qv public.project_quote_versions%rowtype; v_version integer; v_hash text; v_contract_id uuid;
begin
  if not exists (select 1 from private.evento_company_memberships m where m.user_id=p_actor_user_id and m.active=true and m.role in ('owner','admin','ops','finance')) then raise exception 'staff_permission_required'; end if;
  if p_legal_review_status not in ('required','reviewed','approved_for_use') then raise exception 'invalid_legal_review_status'; end if;
  select * into v_quote from public.project_quotes where id=p_quote_id;
  if v_quote.id is null or v_quote.status <> 'accepted' then raise exception 'accepted_quote_required'; end if;
  select qv.* into v_qv from public.project_quote_versions qv join public.project_quote_acceptances qa on qa.quote_version_id=qv.id where qv.quote_id=p_quote_id and qa.user_id=v_quote.user_id order by qv.version_number desc limit 1;
  if v_qv.id is null then raise exception 'quote_acceptance_evidence_required'; end if;
  select coalesce(max(version_number),0)+1 into v_version from public.project_contract_versions where quote_id=p_quote_id;
  v_hash := encode(extensions.digest(concat_ws('|',p_quote_id::text,v_qv.id::text,v_version::text,p_terms_version,coalesce(p_statement_of_work,'[]'::jsonb)::text,coalesce(p_deliverables,'[]'::jsonb)::text,coalesce(p_acceptance_criteria,'[]'::jsonb)::text,coalesce(p_revision_policy,'{}'::jsonb)::text,coalesce(p_support_terms,'{}'::jsonb)::text,coalesce(p_payment_terms,'{}'::jsonb)::text,p_rendered_terms_ar,coalesce(p_rendered_terms_en,''),p_legal_review_status,coalesce(p_valid_until,now()+interval '7 days')::text),'sha256'),'hex');
  insert into public.project_contract_versions(request_id,quote_id,quote_version_id,user_id,version_number,status,terms_version,statement_of_work,deliverables,acceptance_criteria,revision_policy,support_terms,payment_terms,rendered_terms_ar,rendered_terms_en,legal_review_status,valid_until,contract_sha256)
  values(v_quote.request_id,v_quote.id,v_qv.id,v_quote.user_id,v_version,'draft',p_terms_version,coalesce(p_statement_of_work,'[]'::jsonb),coalesce(p_deliverables,'[]'::jsonb),coalesce(p_acceptance_criteria,'[]'::jsonb),coalesce(p_revision_policy,'{}'::jsonb),coalesce(p_support_terms,'{}'::jsonb),coalesce(p_payment_terms,'{}'::jsonb),p_rendered_terms_ar,p_rendered_terms_en,p_legal_review_status,coalesce(p_valid_until,now()+interval '7 days'),v_hash) returning id into v_contract_id;
  return jsonb_build_object('contract_version_id',v_contract_id,'version_number',v_version,'status','draft','contract_sha256',v_hash);
end; $$;

create or replace function public.evento_send_contract_v1(p_actor_user_id uuid,p_contract_version_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_contract public.project_contract_versions%rowtype;
begin
  if not exists (select 1 from private.evento_company_memberships m where m.user_id=p_actor_user_id and m.active=true and m.role in ('owner','admin','ops','finance')) then raise exception 'staff_permission_required'; end if;
  select * into v_contract from public.project_contract_versions where id=p_contract_version_id for update;
  if v_contract.id is null then raise exception 'contract_not_found'; end if;
  if v_contract.status <> 'draft' then raise exception 'contract_not_sendable'; end if;
  if v_contract.legal_review_status <> 'approved_for_use' then raise exception 'legal_review_required'; end if;
  if v_contract.valid_until <= now() then raise exception 'contract_expired'; end if;
  update public.project_contract_versions set status='sent',sent_at=now(),updated_at=now() where id=v_contract.id;
  update public.project_workflows set current_stage='contract_sent',progress_percent=48,updated_at=now() where request_id=v_contract.request_id;
  insert into public.project_request_events(request_id,user_id,status,note,note_ar) values(v_contract.request_id,v_contract.user_id,'approved','EVENTO sent the reviewed contract version for customer acceptance.','أرسلت EVENTO نسخة العقد المراجعة لاعتماد العميل.');
  return jsonb_build_object('contract_version_id',v_contract.id,'status','sent','contract_sha256',v_contract.contract_sha256);
end; $$;

create or replace function public.evento_accept_contract_v1(p_user_id uuid,p_contract_version_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_contract public.project_contract_versions%rowtype; v_is_anonymous boolean; v_acceptance_id uuid;
begin
  select is_anonymous into v_is_anonymous from auth.users where id=p_user_id;
  if v_is_anonymous is null then raise exception 'user_not_found'; end if;
  if v_is_anonymous then raise exception 'verified_account_required'; end if;
  select * into v_contract from public.project_contract_versions where id=p_contract_version_id for update;
  if v_contract.id is null then raise exception 'contract_not_found'; end if;
  if v_contract.user_id <> p_user_id then raise exception 'forbidden'; end if;
  if v_contract.status <> 'sent' then raise exception 'contract_not_acceptable'; end if;
  if v_contract.valid_until <= now() then update public.project_contract_versions set status='expired',updated_at=now() where id=v_contract.id; raise exception 'contract_expired'; end if;
  if v_contract.legal_review_status <> 'approved_for_use' then raise exception 'legal_review_required'; end if;
  if not exists(select 1 from public.project_quote_acceptances qa where qa.quote_version_id=v_contract.quote_version_id and qa.user_id=p_user_id) then raise exception 'accepted_quote_required'; end if;
  insert into public.project_contract_acceptances(contract_version_id,request_id,quote_id,quote_version_id,user_id,contract_sha256,accepted_at)
  values(v_contract.id,v_contract.request_id,v_contract.quote_id,v_contract.quote_version_id,p_user_id,v_contract.contract_sha256,now()) returning id into v_acceptance_id;
  update public.project_contract_versions set status='accepted',accepted_at=now(),updated_at=now() where id=v_contract.id;
  update public.project_workflows set current_stage='contract_approved',progress_percent=50,updated_at=now() where request_id=v_contract.request_id;
  insert into public.project_request_events(request_id,user_id,status,note,note_ar) values(v_contract.request_id,v_contract.user_id,'approved','Customer accepted the reviewed contract version. Verified payment remains a separate gate.','وافق العميل على نسخة العقد المراجعة. يبقى الدفع الموثّق بوابة مستقلة.');
  return jsonb_build_object('contract_version_id',v_contract.id,'contract_acceptance_id',v_acceptance_id,'status','accepted','next_gate','payment');
end; $$;

create or replace function public.evento_prepare_payment_v1(p_user_id uuid,p_quote_id uuid,p_provider text default 'stripe')
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_quote public.project_quotes%rowtype; v_payment public.project_payments%rowtype; v_is_anonymous boolean;
begin
  select is_anonymous into v_is_anonymous from auth.users where id=p_user_id;
  if v_is_anonymous is null then raise exception 'user_not_found'; end if;
  if v_is_anonymous then raise exception 'verified_account_required'; end if;
  select * into v_quote from public.project_quotes where id=p_quote_id for update;
  if v_quote.id is null then raise exception 'quote_not_found'; end if;
  if v_quote.user_id <> p_user_id then raise exception 'forbidden'; end if;
  if v_quote.status <> 'accepted' then raise exception 'quote_not_accepted'; end if;
  if not exists(select 1 from public.project_contract_acceptances ca join public.project_contract_versions cv on cv.id=ca.contract_version_id where ca.quote_id=p_quote_id and ca.user_id=p_user_id and cv.status='accepted') then raise exception 'accepted_contract_required'; end if;
  if p_provider not in ('stripe','tap') then raise exception 'provider_not_supported'; end if;
  insert into public.project_payments(request_id,quote_id,user_id,provider,currency,amount_aed,status) values(v_quote.request_id,v_quote.id,p_user_id,p_provider,'AED',v_quote.total_aed,'pending') on conflict(quote_id,provider) do update set updated_at=now() returning * into v_payment;
  return jsonb_build_object('payment_id',v_payment.id,'payment_code',v_payment.payment_code,'request_id',v_payment.request_id,'quote_id',v_payment.quote_id,'amount_aed',v_payment.amount_aed,'currency',v_payment.currency,'status',v_payment.status,'provider',v_payment.provider);
end; $$;

create or replace function public.evento_mark_payment_paid_v1(p_checkout_session_id text,p_payment_intent_id text,p_provider_event_id text,p_amount_aed numeric,p_currency text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_payment public.project_payments%rowtype;
begin
  select * into v_payment from public.project_payments where provider_checkout_session_id=p_checkout_session_id for update;
  if v_payment.id is null then raise exception 'payment_not_found'; end if;
  if lower(p_currency) <> 'aed' then raise exception 'currency_mismatch'; end if;
  if round(v_payment.amount_aed,2) <> round(p_amount_aed,2) then raise exception 'amount_mismatch'; end if;
  if v_payment.status='paid' then return jsonb_build_object('payment_id',v_payment.id,'status','paid','idempotent',true,'next_gate','fulfillment_authorization'); end if;
  if v_payment.status not in ('pending','checkout_created') then raise exception 'payment_not_payable'; end if;
  update public.project_payments set provider_payment_intent_id=coalesce(p_payment_intent_id,provider_payment_intent_id),status='paid',paid_at=coalesce(paid_at,now()),last_provider_event_id=p_provider_event_id,updated_at=now() where id=v_payment.id;
  update public.project_workflows set current_stage='payment_verified',progress_percent=55,updated_at=now() where request_id=v_payment.request_id;
  insert into public.project_request_events(request_id,user_id,status,note,note_ar) values(v_payment.request_id,v_payment.user_id,'approved','Payment verified by provider. Build remains blocked until human fulfillment authorization.','تم توثيق الدفع من مزود الدفع. يبقى البناء متوقفًا حتى إصدار إذن بشري بالتنفيذ.');
  return jsonb_build_object('payment_id',v_payment.id,'status','paid','request_id',v_payment.request_id,'next_gate','fulfillment_authorization','build_queue_status','pending_payment');
end; $$;

create or replace function public.evento_authorize_fulfillment_v1(p_actor_user_id uuid,p_payment_id uuid,p_owner_review_note text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_payment public.project_payments%rowtype; v_contract_acceptance public.project_contract_acceptances%rowtype; v_auth_id uuid; v_queue public.project_build_queue%rowtype;
begin
  if not exists (select 1 from private.evento_company_memberships m where m.user_id=p_actor_user_id and m.active=true and m.role in ('owner','admin','ops')) then raise exception 'staff_permission_required'; end if;
  if char_length(coalesce(p_owner_review_note,'')) < 10 then raise exception 'owner_review_note_required'; end if;
  select * into v_payment from public.project_payments where id=p_payment_id for update;
  if v_payment.id is null then raise exception 'payment_not_found'; end if;
  if v_payment.status <> 'paid' or v_payment.refunded_aed <> 0 then raise exception 'verified_unrefunded_payment_required'; end if;
  select ca.* into v_contract_acceptance from public.project_contract_acceptances ca join public.project_contract_versions cv on cv.id=ca.contract_version_id where ca.quote_id=v_payment.quote_id and ca.user_id=v_payment.user_id and cv.status='accepted' order by ca.accepted_at desc limit 1;
  if v_contract_acceptance.id is null then raise exception 'accepted_contract_required'; end if;
  insert into public.project_fulfillment_authorizations(payment_id,request_id,quote_id,contract_acceptance_id,user_id,authorized_by_user_id,owner_review_note)
  values(v_payment.id,v_payment.request_id,v_payment.quote_id,v_contract_acceptance.id,v_payment.user_id,p_actor_user_id,p_owner_review_note)
  on conflict(payment_id) do update set owner_review_note=excluded.owner_review_note returning id into v_auth_id;
  update public.project_build_queue set status='queued',queued_at=coalesce(queued_at,now()),updated_at=now() where request_id=v_payment.request_id and quote_id=v_payment.quote_id and status='pending_payment' returning * into v_queue;
  if v_queue.id is null then raise exception 'pending_build_queue_required'; end if;
  update public.project_workflows set current_stage='build_queue',progress_percent=60,updated_at=now() where request_id=v_payment.request_id;
  insert into public.project_request_events(request_id,user_id,status,note,note_ar) values(v_payment.request_id,v_payment.user_id,'approved','Human fulfillment authorization recorded after verified payment; project entered Build Queue.','تم تسجيل إذن بشري بالتنفيذ بعد الدفع الموثّق ونقل المشروع إلى قائمة انتظار البناء.');
  return jsonb_build_object('authorization_id',v_auth_id,'payment_id',v_payment.id,'request_id',v_payment.request_id,'build_queue_status','queued');
end; $$;

revoke all on function public.evento_send_quote_v1(uuid,uuid) from public,anon,authenticated;
revoke all on function public.evento_accept_quote_v1(uuid,uuid) from public,anon,authenticated;
revoke all on function public.evento_create_contract_draft_v1(uuid,uuid,text,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,text,text,text,timestamptz) from public,anon,authenticated;
revoke all on function public.evento_send_contract_v1(uuid,uuid) from public,anon,authenticated;
revoke all on function public.evento_accept_contract_v1(uuid,uuid) from public,anon,authenticated;
revoke all on function public.evento_prepare_payment_v1(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.evento_mark_payment_paid_v1(text,text,text,numeric,text) from public,anon,authenticated;
revoke all on function public.evento_authorize_fulfillment_v1(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.evento_send_quote_v1(uuid,uuid), public.evento_accept_quote_v1(uuid,uuid), public.evento_create_contract_draft_v1(uuid,uuid,text,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,text,text,text,timestamptz), public.evento_send_contract_v1(uuid,uuid), public.evento_accept_contract_v1(uuid,uuid), public.evento_prepare_payment_v1(uuid,uuid,text), public.evento_mark_payment_paid_v1(text,text,text,numeric,text), public.evento_authorize_fulfillment_v1(uuid,uuid,text) to service_role;
