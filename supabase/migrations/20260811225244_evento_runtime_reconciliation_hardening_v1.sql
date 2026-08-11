-- EVENTO Runtime Reconciliation Hardening v1
-- Proven first on Supabase development branch zgyovnqjmaognsjyylvk.
-- Keeps legacy customer-direct SECURITY DEFINER workflow RPCs closed and fixes branch advisor findings.

revoke execute on function public.start_project_workflow(uuid) from public, anon, authenticated;
revoke execute on function public.approve_project_scope(uuid) from public, anon, authenticated;

create policy project_fulfillment_authorizations_deny_authenticated
on public.project_fulfillment_authorizations
for select to authenticated
using (false);

create index if not exists project_quote_versions_request_idx on public.project_quote_versions(request_id);
create index if not exists project_quote_versions_user_idx on public.project_quote_versions(user_id);
create index if not exists project_quote_acceptances_binding_idx on public.project_quote_acceptances(quote_version_id,quote_id,request_id,user_id);
create index if not exists project_contract_versions_request_idx on public.project_contract_versions(request_id);
create index if not exists project_contract_versions_binding_idx on public.project_contract_versions(quote_version_id,quote_id,request_id,user_id);
create index if not exists project_contract_acceptances_binding_idx on public.project_contract_acceptances(contract_version_id,request_id,quote_id,quote_version_id,user_id);
create index if not exists project_fulfillment_authorizations_quote_idx on public.project_fulfillment_authorizations(quote_id);
create index if not exists project_fulfillment_authorizations_contract_idx on public.project_fulfillment_authorizations(contract_acceptance_id);
create index if not exists project_fulfillment_authorizations_user_idx on public.project_fulfillment_authorizations(user_id);
create index if not exists project_fulfillment_authorizations_actor_idx on public.project_fulfillment_authorizations(authorized_by_user_id);

alter policy project_quotes_select_access on public.project_quotes
using (((select auth.uid()) is not null)
  and coalesce((((select auth.jwt())->>'is_anonymous')::boolean),true)=false
  and ((select auth.uid())=user_id or (select private.is_evento_staff())));

alter policy project_build_queue_select_access on public.project_build_queue
using (((select auth.uid()) is not null)
  and coalesce((((select auth.jwt())->>'is_anonymous')::boolean),true)=false
  and ((select auth.uid())=user_id or (select private.is_evento_staff())));

alter policy project_payments_select_access on public.project_payments
using (((select auth.uid()) is not null)
  and coalesce((((select auth.jwt())->>'is_anonymous')::boolean),true)=false
  and ((select auth.uid())=user_id or (select private.is_evento_staff())));

alter policy project_quote_versions_select_access on public.project_quote_versions
using (((select auth.uid()) is not null)
  and coalesce((((select auth.jwt())->>'is_anonymous')::boolean),true)=false
  and ((select auth.uid())=user_id or (select private.is_evento_staff())));

alter policy project_quote_acceptances_select_access on public.project_quote_acceptances
using (((select auth.uid()) is not null)
  and coalesce((((select auth.jwt())->>'is_anonymous')::boolean),true)=false
  and ((select auth.uid())=user_id or (select private.is_evento_staff())));

alter policy project_contract_versions_select_access on public.project_contract_versions
using (((select auth.uid()) is not null)
  and coalesce((((select auth.jwt())->>'is_anonymous')::boolean),true)=false
  and ((select auth.uid())=user_id or (select private.is_evento_staff()))
  and status in ('sent','accepted','expired','withdrawn'));

alter policy project_contract_acceptances_select_access on public.project_contract_acceptances
using (((select auth.uid()) is not null)
  and coalesce((((select auth.jwt())->>'is_anonymous')::boolean),true)=false
  and ((select auth.uid())=user_id or (select private.is_evento_staff())));
