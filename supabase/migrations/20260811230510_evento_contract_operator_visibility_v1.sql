-- EVENTO contract operator visibility.
-- Staff may review internal draft versions; customers may see only sent/accepted/expired/withdrawn versions they own.

alter policy project_contract_versions_select_access on public.project_contract_versions
using (
  ((select auth.uid()) is not null)
  and coalesce((((select auth.jwt())->>'is_anonymous')::boolean),true)=false
  and (
    (select private.is_evento_staff())
    or ((select auth.uid())=user_id and status in ('sent','accepted','expired','withdrawn'))
  )
);
