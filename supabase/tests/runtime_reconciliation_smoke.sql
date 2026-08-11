-- Disposable Supabase branch smoke. MUST run in an isolated branch/test database only.
-- The script creates synthetic auth/business rows inside one transaction and rolls everything back.

begin;

do $$
declare
  v_owner uuid := '11111111-1111-4111-8111-111111111111';
  v_customer uuid := '22222222-2222-4222-8222-222222222222';
  v_other uuid := '33333333-3333-4333-8333-333333333333';
  v_request uuid := '44444444-4444-4444-8444-444444444444';
  v_quote_id uuid;
  v_contract_id uuid;
  v_payment_id uuid;
  v_checkout text := 'cs_test_evento_reconcile_001';
  v_result jsonb;
  v_status text;
  v_expected boolean := false;
begin
  insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,is_anonymous)
  values
    (v_owner,'authenticated','authenticated','owner-reconcile@example.invalid','{}','{}',now(),now(),false),
    (v_customer,'authenticated','authenticated','customer-reconcile@example.invalid','{}','{}',now(),now(),false),
    (v_other,'authenticated','authenticated','other-reconcile@example.invalid','{}','{}',now(),now(),false);

  insert into private.evento_company_memberships(user_id,role,active) values(v_owner,'owner',true);

  insert into public.project_requests(id,user_id,project_type,title,details,status)
  values(v_request,v_customer,'web_app','Reconciliation smoke project','Disposable branch-only smoke project for EVENTO reconciliation testing.','analyzed');

  insert into public.request_analyses(request_id,user_id,complexity,summary,proposed_scope,risks,engine_version)
  values(v_request,v_customer,'medium','Validated branch-only smoke analysis.','["Build bilingual portal","Connect verified payment"]'::jsonb,'["No production mutation"]'::jsonb,'reconcile-smoke-v1');

  insert into public.project_workflows(request_id,user_id,current_stage,progress_percent,estimated_price_aed,scope_approved_at)
  values(v_request,v_customer,'scope_approved',30,1250,now());

  v_result := public.evento_create_quote_draft_v1(v_owner,v_request,'1250','0','0','[{"title":"EVENTO MVP","amount":1250}]'::jsonb,now()+interval '7 days');
  v_quote_id := (v_result->>'quote_id')::uuid;
  perform public.evento_send_quote_v1(v_owner,v_quote_id);

  begin
    perform public.evento_accept_quote_v1(v_other,v_quote_id);
  exception when others then
    if sqlerrm = 'forbidden' then v_expected := true; else raise; end if;
  end;
  if not v_expected then raise exception 'cross_user_quote_acceptance_not_blocked'; end if;

  perform public.evento_accept_quote_v1(v_customer,v_quote_id);

  v_expected := false;
  begin
    perform public.evento_prepare_payment_v1(v_customer,v_quote_id,'stripe');
  exception when others then
    if sqlerrm = 'accepted_contract_required' then v_expected := true; else raise; end if;
  end;
  if not v_expected then raise exception 'payment_before_contract_not_blocked'; end if;

  v_expected := false;
  begin
    perform public.evento_create_contract_draft_v1(
      v_owner,v_quote_id,'terms-2026.08',
      '["Deliver scoped bilingual portal"]'::jsonb,
      '["Source","Preview","Handoff"]'::jsonb,
      '["CI green","Preview approved"]'::jsonb,
      '{"included_revisions":1}'::jsonb,
      '{"support_days":14}'::jsonb,
      '{"mode":"full"}'::jsonb,
      'هذه نسخة عقد تجريبية معزولة لاختبار ربط EVENTO بين عرض السعر والعقد والدفع وإذن التنفيذ فقط.',
      'Isolated test contract for EVENTO reconciliation between quote, contract, payment, and fulfillment authorization.',
      'approved_for_use',now()+interval '7 days');
  exception when others then
    if sqlerrm = 'legal_review_must_start_required' then v_expected := true; else raise; end if;
  end;
  if not v_expected then raise exception 'contract_draft_bypassed_review_gate'; end if;

  v_result := public.evento_create_contract_draft_v1(
    v_owner,v_quote_id,'terms-2026.08',
    '["Deliver scoped bilingual portal"]'::jsonb,
    '["Source","Preview","Handoff"]'::jsonb,
    '["CI green","Preview approved"]'::jsonb,
    '{"included_revisions":1}'::jsonb,
    '{"support_days":14}'::jsonb,
    '{"mode":"full"}'::jsonb,
    'هذه نسخة عقد تجريبية معزولة لاختبار ربط EVENTO بين عرض السعر والعقد والدفع وإذن التنفيذ فقط.',
    'Isolated test contract for EVENTO reconciliation between quote, contract, payment, and fulfillment authorization.',
    'required',now()+interval '7 days');
  v_contract_id := (v_result->>'contract_version_id')::uuid;

  v_expected := false;
  begin
    perform public.evento_send_contract_v1(v_owner,v_contract_id);
  exception when others then
    if sqlerrm = 'legal_review_required' then v_expected := true; else raise; end if;
  end;
  if not v_expected then raise exception 'unreviewed_contract_was_sendable'; end if;

  perform public.evento_approve_contract_for_use_v1(
    v_owner,
    v_contract_id,
    'Owner verified the exact test terms and evidence before allowing this isolated contract version to be sent.'
  );
  perform public.evento_send_contract_v1(v_owner,v_contract_id);
  perform public.evento_accept_contract_v1(v_customer,v_contract_id);

  v_result := public.evento_prepare_payment_v1(v_customer,v_quote_id,'stripe');
  v_payment_id := (v_result->>'payment_id')::uuid;
  perform public.evento_record_checkout_session_v1(v_payment_id,v_checkout,'https://example.invalid/checkout');
  perform public.evento_mark_payment_paid_v1(v_checkout,'pi_test_evento_reconcile_001','evt_test_evento_reconcile_001',1250,'aed');

  select status into v_status from public.project_build_queue where request_id=v_request;
  if v_status <> 'pending_payment' then raise exception 'payment_improperly_started_build:%',v_status; end if;

  perform public.evento_authorize_fulfillment_v1(v_owner,v_payment_id,'Owner reviewed verified payment, accepted contract, and approved controlled project start.');

  select status into v_status from public.project_build_queue where request_id=v_request;
  if v_status <> 'queued' then raise exception 'human_authorization_did_not_queue:%',v_status; end if;

  if not exists(select 1 from public.project_quote_versions where quote_id=v_quote_id) then raise exception 'quote_version_evidence_missing'; end if;
  if not exists(select 1 from public.project_quote_acceptances where quote_id=v_quote_id and user_id=v_customer) then raise exception 'quote_acceptance_evidence_missing'; end if;
  if not exists(select 1 from public.project_contract_acceptances where quote_id=v_quote_id and user_id=v_customer) then raise exception 'contract_acceptance_evidence_missing'; end if;
  if not exists(select 1 from public.project_contract_versions where id=v_contract_id and legal_review_status='approved_for_use' and legal_reviewed_by_user_id=v_owner and legal_reviewed_at is not null and char_length(legal_review_note) >= 20) then raise exception 'contract_review_evidence_missing'; end if;
  if not exists(select 1 from private.project_fulfillment_authorizations where payment_id=v_payment_id and authorized_by_user_id=v_owner) then raise exception 'fulfillment_authorization_evidence_missing'; end if;
end $$;

rollback;
select 'EVENTO reconciliation smoke passed with contract review evidence and rollback' as result;
