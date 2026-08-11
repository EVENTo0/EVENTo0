-- EVENTO Runtime Reconciliation: internalize fulfillment authorization evidence.
-- This table is operator-only and does not belong in the exposed public API schema.

drop policy if exists project_fulfillment_authorizations_deny_authenticated on public.project_fulfillment_authorizations;
alter table public.project_fulfillment_authorizations set schema private;
revoke all on private.project_fulfillment_authorizations from public, anon, authenticated;

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
  insert into private.project_fulfillment_authorizations(payment_id,request_id,quote_id,contract_acceptance_id,user_id,authorized_by_user_id,owner_review_note)
  values(v_payment.id,v_payment.request_id,v_payment.quote_id,v_contract_acceptance.id,v_payment.user_id,p_actor_user_id,p_owner_review_note)
  on conflict(payment_id) do update set owner_review_note=excluded.owner_review_note returning id into v_auth_id;
  update public.project_build_queue set status='queued',queued_at=coalesce(queued_at,now()),updated_at=now() where request_id=v_payment.request_id and quote_id=v_payment.quote_id and status='pending_payment' returning * into v_queue;
  if v_queue.id is null then raise exception 'pending_build_queue_required'; end if;
  update public.project_workflows set current_stage='build_queue',progress_percent=60,updated_at=now() where request_id=v_payment.request_id;
  insert into public.project_request_events(request_id,user_id,status,note,note_ar) values(v_payment.request_id,v_payment.user_id,'approved','Human fulfillment authorization recorded after verified payment; project entered Build Queue.','تم تسجيل إذن بشري بالتنفيذ بعد الدفع الموثّق ونقل المشروع إلى قائمة انتظار البناء.');
  return jsonb_build_object('authorization_id',v_auth_id,'payment_id',v_payment.id,'request_id',v_payment.request_id,'build_queue_status','queued');
end; $$;

revoke all on function public.evento_authorize_fulfillment_v1(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.evento_authorize_fulfillment_v1(uuid,uuid,text) to service_role;
