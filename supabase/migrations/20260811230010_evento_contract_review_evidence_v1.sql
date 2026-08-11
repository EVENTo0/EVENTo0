-- EVENTO contract review evidence. Proven first on isolated Supabase branch.
-- Separates contract drafting from approval-for-use so an operator cannot silently bypass review.

alter table public.project_contract_versions
  add column if not exists legal_reviewed_by_user_id uuid references auth.users(id) on delete restrict,
  add column if not exists legal_reviewed_at timestamptz,
  add column if not exists legal_review_note text;

create index if not exists project_contract_versions_legal_reviewer_idx
  on public.project_contract_versions(legal_reviewed_by_user_id);

create or replace function public.evento_create_contract_draft_v1(
  p_actor_user_id uuid,
  p_quote_id uuid,
  p_terms_version text,
  p_statement_of_work jsonb,
  p_deliverables jsonb,
  p_acceptance_criteria jsonb,
  p_revision_policy jsonb,
  p_support_terms jsonb,
  p_payment_terms jsonb,
  p_rendered_terms_ar text,
  p_rendered_terms_en text,
  p_legal_review_status text,
  p_valid_until timestamptz
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_quote public.project_quotes%rowtype; v_qv public.project_quote_versions%rowtype; v_version integer; v_hash text; v_contract_id uuid;
begin
  if not exists (select 1 from private.evento_company_memberships m where m.user_id=p_actor_user_id and m.active=true and m.role in ('owner','admin','ops','finance')) then raise exception 'staff_permission_required'; end if;
  if p_legal_review_status <> 'required' then raise exception 'legal_review_must_start_required'; end if;
  select * into v_quote from public.project_quotes where id=p_quote_id;
  if v_quote.id is null or v_quote.status <> 'accepted' then raise exception 'accepted_quote_required'; end if;
  select qv.* into v_qv from public.project_quote_versions qv join public.project_quote_acceptances qa on qa.quote_version_id=qv.id where qv.quote_id=p_quote_id and qa.user_id=v_quote.user_id order by qv.version_number desc limit 1;
  if v_qv.id is null then raise exception 'quote_acceptance_evidence_required'; end if;
  select coalesce(max(version_number),0)+1 into v_version from public.project_contract_versions where quote_id=p_quote_id;
  v_hash := encode(extensions.digest(concat_ws('|',p_quote_id::text,v_qv.id::text,v_version::text,p_terms_version,coalesce(p_statement_of_work,'[]'::jsonb)::text,coalesce(p_deliverables,'[]'::jsonb)::text,coalesce(p_acceptance_criteria,'[]'::jsonb)::text,coalesce(p_revision_policy,'{}'::jsonb)::text,coalesce(p_support_terms,'{}'::jsonb)::text,coalesce(p_payment_terms,'{}'::jsonb)::text,p_rendered_terms_ar,coalesce(p_rendered_terms_en,''),coalesce(p_valid_until,now()+interval '7 days')::text),'sha256'),'hex');
  insert into public.project_contract_versions(request_id,quote_id,quote_version_id,user_id,version_number,status,terms_version,statement_of_work,deliverables,acceptance_criteria,revision_policy,support_terms,payment_terms,rendered_terms_ar,rendered_terms_en,legal_review_status,valid_until,contract_sha256)
  values(v_quote.request_id,v_quote.id,v_qv.id,v_quote.user_id,v_version,'draft',p_terms_version,coalesce(p_statement_of_work,'[]'::jsonb),coalesce(p_deliverables,'[]'::jsonb),coalesce(p_acceptance_criteria,'[]'::jsonb),coalesce(p_revision_policy,'{}'::jsonb),coalesce(p_support_terms,'{}'::jsonb),coalesce(p_payment_terms,'{}'::jsonb),p_rendered_terms_ar,p_rendered_terms_en,'required',coalesce(p_valid_until,now()+interval '7 days'),v_hash) returning id into v_contract_id;
  return jsonb_build_object('contract_version_id',v_contract_id,'version_number',v_version,'status','draft','legal_review_status','required','contract_sha256',v_hash);
end; $$;

create or replace function public.evento_approve_contract_for_use_v1(
  p_actor_user_id uuid,
  p_contract_version_id uuid,
  p_review_note text
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_contract public.project_contract_versions%rowtype;
begin
  if not exists (select 1 from private.evento_company_memberships m where m.user_id=p_actor_user_id and m.active=true and m.role in ('owner','admin')) then raise exception 'owner_or_admin_required'; end if;
  if char_length(trim(coalesce(p_review_note,''))) < 20 then raise exception 'legal_review_note_required'; end if;
  select * into v_contract from public.project_contract_versions where id=p_contract_version_id for update;
  if v_contract.id is null then raise exception 'contract_not_found'; end if;
  if v_contract.status <> 'draft' then raise exception 'draft_contract_required'; end if;
  if v_contract.valid_until <= now() then raise exception 'contract_expired'; end if;
  update public.project_contract_versions
  set legal_review_status='approved_for_use',
      legal_reviewed_by_user_id=p_actor_user_id,
      legal_reviewed_at=now(),
      legal_review_note=trim(p_review_note),
      updated_at=now()
  where id=v_contract.id;
  return jsonb_build_object('contract_version_id',v_contract.id,'legal_review_status','approved_for_use','reviewed_by',p_actor_user_id,'reviewed_at',now());
end; $$;

revoke all on function public.evento_approve_contract_for_use_v1(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.evento_approve_contract_for_use_v1(uuid,uuid,text) to service_role;
