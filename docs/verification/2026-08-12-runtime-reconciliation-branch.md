# EVENTO Runtime Reconciliation — Branch Verification

Date: 2026-08-12
Environment: isolated Supabase development branch
Parent Production ref: `jaxhaiaftpegcodkzaus`
Development branch ref: `zgyovnqjmaognsjyylvk`
Git branch: `evento/runtime-reconciliation-v1`

## Baseline

The development branch inherited the live migration history through:

- `20260811213155_fix_evento_payment_event_status_v1`

It contains no Production business data.

## Reconciliation migrations applied successfully

1. `20260811225144_evento_runtime_reconciliation_bridge_v1`
2. `20260811225244_evento_runtime_reconciliation_hardening_v1`
3. `20260811225610_evento_internalize_fulfillment_authorization_v1`

The bridge preserves the live writable compatibility path:

`project_requests -> request_analyses -> project_workflows -> project_quotes -> project_payments -> project_build_queue`

and adds immutable evidence rather than a second writable commercial truth:

- `project_quote_versions`
- `project_quote_acceptances`
- `project_contract_versions`
- `project_contract_acceptances`
- `private.project_fulfillment_authorizations`

## Proven branch behavior

A disposable synthetic flow was executed inside one SQL transaction and rolled back.

Verified:

- wrong customer cannot accept another customer's quote;
- a sent quote creates an immutable SHA-256-bound quote version;
- accepting a quote records acceptance against that exact version;
- payment preparation is rejected until an approved contract version is accepted;
- contract acceptance is tied to the accepted quote version;
- provider-verified payment can mark `project_payments=paid`;
- verified payment alone leaves `project_build_queue=pending_payment`;
- only owner/admin/ops fulfillment authorization promotes the queue to `queued`;
- fulfillment authorization evidence is internal under the `private` schema;
- all synthetic data was rolled back.

Observed smoke result:

`EVENTO reconciled E2E smoke passed after private authorization hardening`

## Security review

After hardening, the Supabase Security Advisor no longer reports the legacy public/authenticated SECURITY DEFINER execution warnings for:

- `start_project_workflow`
- `approve_project_scope`

They were revoked from `public`, `anon`, and `authenticated` in the development branch because current EVENTO Mobile PR #4 routes these transitions through the authenticated `workflow-transition` Edge Function instead.

Remaining anonymous-access warnings relate to the intentional guest request/analysis/workflow surfaces and remain a separate Production auth-policy decision. Private-schema no-policy notices are informational defense-in-depth notices, not browser grants.

## Production boundary

No reconciliation migration was applied to Production.
No Stripe live charge was created.
No Production deployment occurred.
No agent build was started.
No release authority was granted.

## Next gate

Adapt EVENTO Mobile/Web to the reconciled sequence:

`quote accepted -> reviewed contract accepted -> payment -> verified webhook -> human fulfillment authorization -> build queue`

Then prove the sequence using Stripe test mode and a real Vercel branch Preview before any Production promotion.
