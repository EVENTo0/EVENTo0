-- EVENTO Gate 7 — Phone-First Preview & Customer Status
-- REVIEW ONLY. Do not apply directly to production.
-- Apply only after Gate 0–6 migrations are green in an isolated Supabase branch/test environment.
-- Preview is evidence for client review; it is never equivalent to production deployment or delivery acceptance.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'evento_preview_release_status') then
    create type public.evento_preview_release_status as enum ('draft','published','superseded','expired','revoked');
  end if;
  if not exists (select 1 from pg_type where typname = 'evento_preview_feedback_status') then
    create type public.evento_preview_feedback_status as enum ('open','acknowledged','resolved','dismissed');
  end if;
end $$;

-- Customer-visible preview metadata. It deliberately contains no repository names, branches,
-- provider deployment IDs, credentials, raw build logs, or production target information.
create table if not exists public.project_preview_releases (
  id uuid primary key default gen_random_uuid(),
  customer_project_id uuid not null,
  request_id uuid not null,
  user_id uuid not null,
  milestone_id uuid null,
  preview_number integer not null check (preview_number > 0),
  version_label text not null check (char_length(version_label) between 1 and 80),
  title_ar text not null check (char_length(title_ar) between 3 and 220),
  title_en text null check (title_en is null or char_length(title_en) between 3 and 220),
  platform text not null check (platform in ('web','android','ios','game_web','game_stream','desktop','other')),
  access_mode text not null check (access_mode in ('public_link','protected_link','authenticated_app','install_link','stream_link')),
  preview_url text not null check (preview_url ~ '^https://'),
  status public.evento_preview_release_status not null default 'draft',
  customer_visible boolean not null default false,
  review_message_ar text null check (review_message_ar is null or char_length(review_message_ar) <= 3000),
  review_message_en text null check (review_message_en is null or char_length(review_message_en) <= 3000),
  published_at timestamptz null,
  expires_at timestamptz null,
  superseded_at timestamptz null,
  revoked_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_project_id, preview_number),
  unique (id, customer_project_id, request_id, user_id),
  foreign key (customer_project_id, request_id, user_id)
    references public.customer_projects(id, request_id, user_id) on delete restrict,
  foreign key (milestone_id, customer_project_id, request_id, user_id)
    references public.project_milestones(id, customer_project_id, request_id, user_id) on delete restrict,
  check (
    (status = 'published' and customer_visible = true and published_at is not null)
    or status <> 'published'
  ),
  check (expires_at is null or published_at is null or expires_at > published_at)
);

-- Internal exact binding from customer-facing preview to CI/Preview build evidence.
-- No browser grants: this is where provider/build identity stays.
create table if not exists public.project_preview_bindings (
  preview_release_id uuid primary key references public.project_preview_releases(id) on delete restrict,
  customer_project_id uuid not null references public.customer_projects(id) on delete restrict,
  build_run_id uuid not null references public.project_build_runs(id) on delete restrict,
  workspace_id uuid not null references public.project_workspaces(id) on delete restrict,
  provider text not null check (provider in ('vercel','github','firebase','testflight','app_distribution','unity','unreal','external')),
  provider_deployment_id text null check (provider_deployment_id is null or char_length(provider_deployment_id) <= 240),
  source_commit_sha text not null check (source_commit_sha ~ '^[0-9a-fA-F]{7,64}$'),
  source_branch text not null check (char_length(source_branch) between 1 and 240),
  artifact_ref text null check (artifact_ref is null or char_length(artifact_ref) <= 500),
  evidence_sha256 text not null check (evidence_sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  unique (preview_release_id, customer_project_id, build_run_id)
);

-- Optional safe media references for phone-first review. These are not raw CI artifacts.
create table if not exists public.project_preview_media (
  id uuid primary key default gen_random_uuid(),
  preview_release_id uuid not null references public.project_preview_releases(id) on delete restrict,
  customer_project_id uuid not null references public.customer_projects(id) on delete restrict,
  media_kind text not null check (media_kind in ('screenshot','short_video','qr_image')),
  media_url text not null check (media_url ~ '^https://'),
  caption_ar text null check (caption_ar is null or char_length(caption_ar) <= 500),
  caption_en text null check (caption_en is null or char_length(caption_en) <= 500),
  sort_order integer not null default 0 check (sort_order >= 0),
  customer_visible boolean not null default true,
  created_at timestamptz not null default now()
);

-- Customer feedback is bound to one exact published preview version.
create table if not exists public.project_preview_feedback (
  id uuid primary key default gen_random_uuid(),
  preview_release_id uuid not null,
  customer_project_id uuid not null,
  request_id uuid not null,
  user_id uuid not null,
  feedback_kind text not null check (feedback_kind in ('comment','issue','approval_ready','revision_request')),
  body text not null check (char_length(body) between 2 and 4000),
  status public.evento_preview_feedback_status not null default 'open',
  revision_counted boolean not null default false,
  created_at timestamptz not null default now(),
  acknowledged_at timestamptz null,
  resolved_at timestamptz null,
  unique (id, preview_release_id, customer_project_id, request_id, user_id),
  foreign key (preview_release_id, customer_project_id, request_id, user_id)
    references public.project_preview_releases(id, customer_project_id, request_id, user_id) on delete restrict,
  check (revision_counted = false or feedback_kind = 'revision_request')
);

create index if not exists project_preview_releases_project_number_idx on public.project_preview_releases(customer_project_id, preview_number desc);
create index if not exists project_preview_releases_user_published_idx on public.project_preview_releases(user_id, published_at desc);
create index if not exists project_preview_media_release_idx on public.project_preview_media(preview_release_id, sort_order);
create index if not exists project_preview_feedback_release_created_idx on public.project_preview_feedback(preview_release_id, created_at desc);
create index if not exists project_preview_feedback_project_status_idx on public.project_preview_feedback(customer_project_id, status);

alter table public.project_preview_releases enable row level security;
alter table public.project_preview_bindings enable row level security;
alter table public.project_preview_media enable row level security;
alter table public.project_preview_feedback enable row level security;

revoke all on public.project_preview_releases from anon, authenticated;
revoke all on public.project_preview_bindings from anon, authenticated;
revoke all on public.project_preview_media from anon, authenticated;
revoke all on public.project_preview_feedback from anon, authenticated;

grant select on public.project_preview_releases to authenticated;
grant select on public.project_preview_media to authenticated;
grant select on public.project_preview_feedback to authenticated;
grant insert (preview_release_id, feedback_kind, body) on public.project_preview_feedback to authenticated;
-- Exact build/provider binding deliberately receives no authenticated grant.

drop policy if exists project_preview_releases_select_own_published on public.project_preview_releases;
create policy project_preview_releases_select_own_published
on public.project_preview_releases for select
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
  and coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  and customer_visible = true
  and status = 'published'
  and (expires_at is null or expires_at > now())
);

drop policy if exists project_preview_media_select_own_visible on public.project_preview_media;
create policy project_preview_media_select_own_visible
on public.project_preview_media for select
to authenticated
using (
  customer_visible = true
  and exists (
    select 1
    from public.project_preview_releases r
    where r.id = preview_release_id
      and r.customer_project_id = project_preview_media.customer_project_id
      and r.user_id = (select auth.uid())
      and r.customer_visible = true
      and r.status = 'published'
      and (r.expires_at is null or r.expires_at > now())
  )
  and coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false
);

drop policy if exists project_preview_feedback_select_own on public.project_preview_feedback;
create policy project_preview_feedback_select_own
on public.project_preview_feedback for select
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
  and coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false
);

drop policy if exists project_preview_feedback_insert_own on public.project_preview_feedback;
create policy project_preview_feedback_insert_own
on public.project_preview_feedback for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
  and coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false
);

create or replace function private.finalize_preview_feedback()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_release public.project_preview_releases%rowtype;
begin
  if v_uid is null then raise exception 'authentication_required'; end if;
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then raise exception 'permanent_account_required'; end if;

  select r.* into v_release
  from public.project_preview_releases r
  where r.id = new.preview_release_id;
  if not found then raise exception 'preview_not_found'; end if;
  if v_release.user_id <> v_uid then raise exception 'preview_owner_mismatch'; end if;
  if v_release.status <> 'published' or v_release.customer_visible is not true then raise exception 'preview_not_published'; end if;
  if v_release.expires_at is not null and v_release.expires_at <= now() then raise exception 'preview_expired'; end if;

  new.customer_project_id := v_release.customer_project_id;
  new.request_id := v_release.request_id;
  new.user_id := v_uid;
  new.status := 'open';
  new.revision_counted := false;
  new.created_at := now();
  new.acknowledged_at := null;
  new.resolved_at := null;
  return new;
end;
$$;

revoke all on function private.finalize_preview_feedback() from public, anon, authenticated;

create trigger finalize_preview_feedback_before_insert
before insert on public.project_preview_feedback
for each row execute function private.finalize_preview_feedback();

-- Validate that a published preview is backed by a successful Preview build and exact workspace/commit evidence.
create or replace function private.validate_preview_release_binding()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_release public.project_preview_releases%rowtype;
  v_build public.project_build_runs%rowtype;
begin
  select r.* into v_release from public.project_preview_releases r where r.id = new.preview_release_id;
  if not found then raise exception 'preview_release_not_found'; end if;
  if v_release.customer_project_id <> new.customer_project_id then raise exception 'preview_project_mismatch'; end if;

  select b.* into v_build from public.project_build_runs b where b.id = new.build_run_id;
  if not found then raise exception 'preview_build_not_found'; end if;
  if v_build.customer_project_id <> new.customer_project_id then raise exception 'preview_build_project_mismatch'; end if;
  if v_build.workspace_id <> new.workspace_id then raise exception 'preview_workspace_mismatch'; end if;
  if v_build.environment <> 'preview' then raise exception 'preview_build_environment_required'; end if;
  if v_build.status <> 'succeeded' then raise exception 'successful_preview_build_required'; end if;
  if lower(v_build.commit_sha) <> lower(new.source_commit_sha) then raise exception 'preview_commit_mismatch'; end if;
  return new;
end;
$$;

revoke all on function private.validate_preview_release_binding() from public, anon, authenticated;

create trigger validate_preview_release_binding_before_write
before insert or update on public.project_preview_bindings
for each row execute function private.validate_preview_release_binding();
