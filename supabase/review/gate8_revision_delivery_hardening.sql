-- EVENTO Gate 8 hardening — REVIEW CANDIDATE ONLY.
-- Apply only after gate8_revision_delivery_foundation.sql has been reconciled against an isolated test database.
-- Never apply either review file directly to Production.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- A counted included revision is an operator decision, never a customer/agent side effect.
create or replace function private.enforce_revision_case_decision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_operator public.evento_operator_grants%rowtype;
  v_policy public.project_revision_policies%rowtype;
begin
  if new.triaged_by_user_id is not null then
    select g.* into v_operator
    from public.evento_operator_grants g
    where g.user_id = new.triaged_by_user_id
      and g.active = true
      and g.operator_role in ('owner','operator','reviewer');
    if not found then raise exception 'active_evento_reviewer_required'; end if;
  end if;

  if new.authorized_by_user_id is not null then
    select g.* into v_operator
    from public.evento_operator_grants g
    where g.user_id = new.authorized_by_user_id
      and g.active = true
      and g.operator_role in ('owner','operator');
    if not found then raise exception 'active_evento_operator_required'; end if;
  end if;

  if new.disposition = 'included_revision' and new.counted_included_revision is true
     and (tg_op = 'INSERT' or old.counted_included_revision is false) then
    select p.* into v_policy
    from public.project_revision_policies p
    where p.id = new.revision_policy_id
    for update;
    if not found then raise exception 'revision_policy_not_found'; end if;
    if v_policy.included_revisions_used >= v_policy.included_revision_limit then
      raise exception 'included_revision_entitlement_exhausted';
    end if;
    update public.project_revision_policies
    set included_revisions_used = included_revisions_used + 1,
        updated_at = now()
    where id = v_policy.id;
  end if;

  if tg_op = 'UPDATE' and old.counted_included_revision is true and new.counted_included_revision is false then
    raise exception 'counted_revision_cannot_be_silently_unconsumed';
  end if;

  if new.disposition = 'change_order_required' then
    new.change_order_required := true;
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_revision_case_decision() from public, anon, authenticated;

drop trigger if exists enforce_revision_case_decision_before_write on public.project_revision_cases;
create trigger enforce_revision_case_decision_before_write
before insert or update on public.project_revision_cases
for each row execute function private.enforce_revision_case_decision();

-- Ready-for-acceptance means the exact source Preview is still valid and all visible work is resolved.
create or replace function private.enforce_delivery_ready_boundary()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_preview public.project_preview_releases%rowtype;
begin
  if tg_op = 'UPDATE' and old.status = 'accepted' and new.status = 'accepted' then
    if new.customer_project_id is distinct from old.customer_project_id
      or new.request_id is distinct from old.request_id
      or new.user_id is distinct from old.user_id
      or new.source_preview_release_id is distinct from old.source_preview_release_id
      or new.delivery_number is distinct from old.delivery_number
      or new.version_label is distinct from old.version_label
      or new.deliverables_snapshot is distinct from old.deliverables_snapshot
      or new.acceptance_criteria_snapshot is distinct from old.acceptance_criteria_snapshot
      or new.support_snapshot is distinct from old.support_snapshot
      or new.handoff_summary_ar is distinct from old.handoff_summary_ar
      or new.package_sha256 is distinct from old.package_sha256 then
      raise exception 'accepted_delivery_immutable';
    end if;
  end if;

  if new.status = 'ready_for_acceptance' then
    if new.customer_visible is not true or new.ready_at is null then
      raise exception 'delivery_visibility_required';
    end if;

    select p.* into v_preview
    from public.project_preview_releases p
    where p.id = new.source_preview_release_id
      and p.customer_project_id = new.customer_project_id
      and p.request_id = new.request_id
      and p.user_id = new.user_id;
    if not found then raise exception 'delivery_source_preview_not_found'; end if;
    if v_preview.status <> 'published' or v_preview.customer_visible is not true then
      raise exception 'published_preview_required_for_delivery';
    end if;
    if v_preview.expires_at is not null and v_preview.expires_at <= now() then
      raise exception 'delivery_source_preview_expired';
    end if;

    if exists (
      select 1 from public.project_revision_cases r
      where r.customer_project_id = new.customer_project_id
        and r.status not in ('resolved','cancelled')
    ) then raise exception 'open_revision_blocks_delivery_ready'; end if;

    if exists (
      select 1 from public.project_change_orders c
      where c.customer_project_id = new.customer_project_id
        and c.status not in ('paid','rejected','cancelled')
    ) then raise exception 'open_change_order_blocks_delivery_ready'; end if;

    if exists (
      select 1 from public.project_acceptance_criteria a
      where a.customer_project_id = new.customer_project_id
        and a.customer_visible = true
        and a.status not in ('passed','waived')
    ) then raise exception 'acceptance_criteria_not_satisfied'; end if;
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_delivery_ready_boundary() from public, anon, authenticated;

drop trigger if exists enforce_delivery_ready_boundary_before_write on public.project_delivery_packages;
create trigger enforce_delivery_ready_boundary_before_write
before insert or update on public.project_delivery_packages
for each row execute function private.enforce_delivery_ready_boundary();

-- Release approval remains human/operator controlled after customer delivery acceptance.
create or replace function private.enforce_release_authorization_decision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_operator public.evento_operator_grants%rowtype;
  v_delivery public.project_delivery_packages%rowtype;
begin
  if new.status in ('approved','rejected') then
    if new.decided_by_user_id is null or new.decided_at is null then
      raise exception 'human_release_decision_required';
    end if;
    select g.* into v_operator
    from public.evento_operator_grants g
    where g.user_id = new.decided_by_user_id
      and g.active = true
      and g.operator_role in ('owner','operator');
    if not found then raise exception 'active_evento_operator_required'; end if;
  end if;

  if new.status = 'approved' then
    select d.* into v_delivery
    from public.project_delivery_packages d
    where d.id = new.delivery_package_id;
    if not found then raise exception 'delivery_package_not_found'; end if;
    if v_delivery.status <> 'accepted' then raise exception 'customer_delivery_acceptance_required'; end if;
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_release_authorization_decision() from public, anon, authenticated;

drop trigger if exists enforce_release_authorization_decision_before_write on public.project_release_authorizations;
create trigger enforce_release_authorization_decision_before_write
before insert or update on public.project_release_authorizations
for each row execute function private.enforce_release_authorization_decision();

comment on function private.enforce_revision_case_decision() is 'Gate 8 operator-only revision entitlement accounting. Agents/customers cannot classify or consume included revisions.';
comment on function private.enforce_delivery_ready_boundary() is 'Gate 8 delivery readiness boundary. Published Preview + resolved revisions/change orders + satisfied criteria are required.';
comment on function private.enforce_release_authorization_decision() is 'Gate 8 human release boundary. Delivery acceptance never self-authorizes Production or store release.';
