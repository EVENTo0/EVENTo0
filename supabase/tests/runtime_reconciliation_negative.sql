-- EVENTO Runtime Reconciliation negative suite.
-- ISOLATED SUPABASE DEVELOPMENT BRANCH ONLY. All synthetic rows are rolled back.

begin;

do $$
declare
  v_owner uuid := '51111111-1111-4111-8111-111111111111';
  v_customer_a uuid := '52222222-2222-4222-8222-222222222222';
  v_customer_b uuid := '53333333-3333-4333-8333-333333333333';
  v_request uuid := '54444444-4444-4444-8444-444444444444';
  v_quote_id uuid;
  v_contract_id uuid;
  v_payment_id uuid;
  v_result jsonb;
  v_expected boolean;
begin
  insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,is_anonymous) values
    (v_owner,'authenticated','authenticated','owner-rls@example.invalid','{}','{}',now(),now(),false),
    (v_customer_a,'authenticated','authenticated','customer-a@example.invalid','{}','{}',now(),now(),false),
    (v_customer_b,'authenticated','authenticated','customer-b@example.invalid','{}','{}',now(),now(),false);

  insert into private.evento_company_memberships(user_id,role,active)
  values(v_owner,'owner',true);

  insert into public.project_requests(id,user_id,project_type,title,details,status)
  values(v_request,v_customer_a,'web_app','RLS smoke','Branch-only RLS negative suite.','analyzed');

  insert into public.request_analyses(request_id,user_id,complexity,summary,proposed_scope,risks,engine_version)
  values(v_request,v_customer_a,'medium','RLS analysis','["scope"]','[]','rls-v1');

  insert into public.project_workflows(request_id,user_id,current_stage,progress_percent,scope_approved_at)
  values(v_request,v_customer_a,'scope_approved',30,now());

  v_result := public.evento_create_quote_draft_v1(v_owner,v_request,'500','0','0','[]'::jsonb,now()+interval '7 days');
  v_quote_id := (v_result->>'quote_id')::uuid;
  perform public.evento_send_quote_v1(v_owner,v_quote_id);
  perform public.evento_accept_quote_v1(v_customer_a,v_quote_id);

  v_result := public.evento_create_contract_draft_v1(
    v_owner,v_quote_id,'terms-rls','["scope"]','["source"]','["pass"]','{}','{}','{}',
    'هذه شروط اختبار RLS معزولة طويلة بما يكفي ولا تمثل عقدًا حقيقيًا أو التزامًا تجاريًا.',
    'Isolated RLS test terms only.','required',now()+interval '7 days');
  v_contract_id := (v_result->>'contract_version_id')::uuid;
  perform public.evento_approve_contract_for_use_v1(v_owner,v_contract_id,'Owner reviewed the isolated RLS fixture before test-only sending.');
  perform public.evento_send_contract_v1(v_owner,v_contract_id);
  perform public.evento_accept_contract_v1(v_customer_a,v_contract_id);

  v_result := public.evento_prepare_payment_v1(v_customer_a,v_quote_id,'stripe');
  v_payment_id := (v_result->>'payment_id')::uuid;
  perform public.evento_record_checkout_session_v1(v_payment_id,'cs_test_rls_001','https://example.invalid/rls');

  v_expected := false;
  begin
    perform public.evento_mark_payment_paid_v1('cs_test_rls_001','pi_test_rls_001','evt_test_rls_currency',500,'usd');
  exception when others then
    if sqlerrm='currency_mismatch' then v_expected:=true; else raise; end if;
  end;
  if not v_expected then raise exception 'currency_mismatch_not_blocked'; end if;

  v_expected := false;
  begin
    perform public.evento_mark_payment_paid_v1('cs_test_rls_001','pi_test_rls_001','evt_test_rls_amount',499,'aed');
  exception when others then
    if sqlerrm='amount_mismatch' then v_expected:=true; else raise; end if;
  end;
  if not v_expected then raise exception 'amount_mismatch_not_blocked'; end if;
end $$;

set local role authenticated;
select set_config('request.jwt.claims', json_build_object(
  'sub','53333333-3333-4333-8333-333333333333',
  'role','authenticated',
  'is_anonymous',false
)::text, true);

do $$ begin
  if exists(select 1 from public.project_quotes where request_id='54444444-4444-4444-8444-444444444444') then raise exception 'cross_user_quote_read_leak'; end if;
  if exists(select 1 from public.project_contract_versions where request_id='54444444-4444-4444-8444-444444444444') then raise exception 'cross_user_contract_read_leak'; end if;
  if exists(select 1 from public.project_payments where request_id='54444444-4444-4444-8444-444444444444') then raise exception 'cross_user_payment_read_leak'; end if;
end $$;

select set_config('request.jwt.claims', json_build_object(
  'sub','53333333-3333-4333-8333-333333333333',
  'role','authenticated',
  'is_anonymous',true
)::text, true);

do $$ begin
  if exists(select 1 from public.project_quotes) then raise exception 'anonymous_quote_read_leak'; end if;
  if exists(select 1 from public.project_contract_versions) then raise exception 'anonymous_contract_read_leak'; end if;
  if exists(select 1 from public.project_payments) then raise exception 'anonymous_payment_read_leak'; end if;
  if has_function_privilege('authenticated','public.evento_accept_quote_v1(uuid,uuid)','EXECUTE') then raise exception 'authenticated_can_execute_privileged_quote_rpc'; end if;
  if has_function_privilege('authenticated','public.evento_accept_contract_v1(uuid,uuid)','EXECUTE') then raise exception 'authenticated_can_execute_privileged_contract_rpc'; end if;
  if has_function_privilege('authenticated','public.evento_authorize_fulfillment_v1(uuid,uuid,text)','EXECUTE') then raise exception 'authenticated_can_execute_fulfillment_rpc'; end if;
end $$;

reset role;
rollback;
select 'EVENTO R3 negative RLS and provider mismatch suite passed with rollback' as result;
