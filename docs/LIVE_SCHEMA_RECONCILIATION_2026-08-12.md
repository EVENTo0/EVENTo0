# EVENTO Live Supabase Schema Reconciliation — 2026-08-12

## Status

**Activation blocker, not a rollback request.**

A read-only audit of the connected EVENTO Production Supabase project (`jaxhaiaftpegcodkzaus`) shows the live commercial schema has continued evolving independently of the recovery branch.

Latest observed Production migration versions include:

- `20260811172458_evento_owner_admin_security_v1`
- `20260811172822_evento_server_workflow_transition_v1`
- `20260811173203_evento_rls_policy_performance_v1`
- `20260811173609_evento_quote_build_queue_foundation_v1`
- `20260811173927_evento_quote_verified_customer_gate_v1`
- `20260811212913_evento_payment_ledger_foundation_v1`
- `20260811213124_fix_evento_payment_queue_timestamp_v1`

Current observed public business tables are:

- `project_requests`
- `request_analyses`
- `project_request_events`
- `project_workflows`
- `project_quotes`
- `project_payments`
- `project_build_queue`

The deeper recovery-branch tables such as `quotes`, `quote_versions`, `contract_agreements`, `payment_orders`, `customer_projects`, `project_preview_releases`, and Gate 8 tables are not currently present in Production.

## Important consequence

Do **not** apply the recovery branch Gate 3–8 SQL directly to Production or assume it is already represented by similarly named Production migrations.

The live Production path and recovery-branch path must first be mapped table-by-table and transition-by-transition in an isolated Supabase test environment.

## Existing live model observations

`project_quotes` currently carries customer/request ownership, AED totals, status, pricing breakdown, scope snapshot and quote timestamps.

`project_payments` currently carries request/quote/customer ownership, provider state, AED amount, provider checkout/payment identifiers, paid/refund state and provider-event tracking.

`project_build_queue` currently carries request/customer ownership, optional quote binding, build status/priority, source repository/branch references, Preview/artifact URLs and build timestamps.

These tables may contain useful production-era behavior that must be preserved or migrated deliberately rather than overwritten.

## Reconciliation gate

Before any Gate 3–8 migration is generated for Production:

1. create or approve an isolated Supabase development/test branch;
2. snapshot current live schema definitions, constraints, RLS policies, functions/triggers and indexes;
3. map `project_quotes` → recovery quote/version model;
4. map `project_payments` → verified payment-order/event model;
5. map `project_build_queue` → controlled workspace/build/Preview model;
6. decide whether to migrate, adapt, or retain compatibility views/adapters;
7. preserve `evento-mobile` RPC/contracts;
8. run cross-user/anonymous/security negative tests;
9. run migration history checks and Supabase advisors;
10. only then generate migration files via the Supabase CLI and request owner approval for Production.

No Production mutation was performed by this audit.
