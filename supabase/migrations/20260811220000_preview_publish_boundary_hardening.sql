-- EVENTO Gate 7 hardening — preview publication boundary
-- REVIEW ONLY. Apply after 20260811215000_phone_first_preview_customer_status_foundation.sql.
-- A customer-visible Published preview must already have exact successful Preview build evidence.

create or replace function private.enforce_preview_release_publish_boundary()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_binding public.project_preview_bindings%rowtype;
  v_build public.project_build_runs%rowtype;
begin
  if tg_op = 'UPDATE' and old.status = 'published' and new.status = 'published' then
    if new.customer_project_id is distinct from old.customer_project_id
      or new.request_id is distinct from old.request_id
      or new.user_id is distinct from old.user_id
      or new.milestone_id is distinct from old.milestone_id
      or new.preview_number is distinct from old.preview_number
      or new.version_label is distinct from old.version_label
      or new.platform is distinct from old.platform
      or new.access_mode is distinct from old.access_mode
      or new.preview_url is distinct from old.preview_url then
      raise exception 'published_preview_immutable';
    end if;
  end if;

  if new.status = 'published' then
    if new.customer_visible is not true or new.published_at is null then
      raise exception 'published_preview_visibility_required';
    end if;

    select b.* into v_binding
    from public.project_preview_bindings b
    where b.preview_release_id = new.id
      and b.customer_project_id = new.customer_project_id;
    if not found then raise exception 'preview_binding_required_before_publish'; end if;

    select r.* into v_build
    from public.project_build_runs r
    where r.id = v_binding.build_run_id;
    if not found then raise exception 'preview_build_not_found'; end if;
    if v_build.customer_project_id <> new.customer_project_id then raise exception 'preview_build_project_mismatch'; end if;
    if v_build.workspace_id <> v_binding.workspace_id then raise exception 'preview_workspace_mismatch'; end if;
    if v_build.environment <> 'preview' then raise exception 'preview_build_environment_required'; end if;
    if v_build.status <> 'succeeded' then raise exception 'successful_preview_build_required'; end if;
    if lower(v_build.commit_sha) <> lower(v_binding.source_commit_sha) then raise exception 'preview_commit_mismatch'; end if;
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_preview_release_publish_boundary() from public, anon, authenticated;

create trigger enforce_preview_release_publish_boundary_before_write
before insert or update on public.project_preview_releases
for each row execute function private.enforce_preview_release_publish_boundary();
