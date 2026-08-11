-- EVENTO Runtime Reconciliation Preflight
-- READ ONLY. Safe for evidence capture; performs no DDL/DML.
-- Run against the intended Supabase environment before any reconciliation migration.

begin;
set transaction read only;

-- 1. Confirm the live commercial table set.
select table_schema, table_name
from information_schema.tables
where table_schema in ('public','private')
  and table_name in (
    'project_requests','request_analyses','project_request_events','project_workflows',
    'project_quotes','project_payments','project_build_queue','evento_company_memberships'
  )
order by table_schema, table_name;

-- 2. Capture live columns used by the current mobile/control-plane runtime.
select table_name, ordinal_position, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema='public'
  and table_name in (
    'project_requests','request_analyses','project_request_events','project_workflows',
    'project_quotes','project_payments','project_build_queue'
  )
order by table_name, ordinal_position;

-- 3. Capture row counts without exposing row contents.
select 'project_requests' as table_name, count(*)::bigint as row_count from public.project_requests
union all select 'request_analyses', count(*) from public.request_analyses
union all select 'project_request_events', count(*) from public.project_request_events
union all select 'project_workflows', count(*) from public.project_workflows
union all select 'project_quotes', count(*) from public.project_quotes
union all select 'project_payments', count(*) from public.project_payments
union all select 'project_build_queue', count(*) from public.project_build_queue
order by table_name;

-- 4. Capture RLS and grants relevant to customer/staff separation.
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname='public'
  and tablename in (
    'project_requests','request_analyses','project_request_events','project_workflows',
    'project_quotes','project_payments','project_build_queue'
  )
order by tablename, policyname;

-- 5. Capture privileged public functions and executable roles.
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosecdef as security_definer,
  coalesce(array_agg(distinct r.rolname) filter (where r.rolname is not null), '{}') as explicitly_executable_roles
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
left join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a on true
left join pg_roles r on r.oid=a.grantee
where n.nspname in ('public','private')
  and (
    p.proname like 'evento_%'
    or p.proname in ('start_project_workflow','approve_project_scope')
  )
group by n.nspname, p.proname, p.oid, p.prosecdef
order by n.nspname, p.proname;

-- 6. Identify whether deeper recovery-model tables already exist.
select target.table_name,
       to_regclass('public.' || target.table_name) is not null as exists_in_environment
from (values
  ('quotes'),('quote_versions'),('quote_items'),('proposal_acceptances'),
  ('contract_agreements'),('contract_versions'),('contract_acceptances'),
  ('payment_orders'),('payment_attempts'),('payment_events'),('refunds'),
  ('customer_projects'),('project_workspaces'),('project_agent_runs'),
  ('project_preview_versions'),('project_preview_feedback'),
  ('project_revision_cases'),('project_delivery_packages'),
  ('project_delivery_acceptances'),('project_release_authorizations')
) as target(table_name)
order by target.table_name;

-- 7. Foreign-key/index evidence for the live quote/payment/build path.
select
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name as foreign_table_name,
  ccu.column_name as foreign_column_name
from information_schema.table_constraints tc
left join information_schema.key_column_usage kcu
  on tc.constraint_name=kcu.constraint_name and tc.constraint_schema=kcu.constraint_schema
left join information_schema.constraint_column_usage ccu
  on tc.constraint_name=ccu.constraint_name and tc.constraint_schema=ccu.constraint_schema
where tc.table_schema='public'
  and tc.table_name in ('project_quotes','project_payments','project_build_queue')
order by tc.table_name, tc.constraint_name, kcu.ordinal_position;

rollback;
