# EVENTO Runtime Reconciliation Sprint

Date: 2026-08-12
Status: ACTIVE / ISOLATED
Canonical company repository: `EVENTo0/EVENTo0`
Parent recovery branch: `evento/revenue-engine-recovery-v1`
Supabase production ref: `jaxhaiaftpegcodkzaus`
Supabase development ref: `zgyovnqjmaognsjyylvk`

## Objective

Move EVENTO from source-complete Revenue Engine foundations toward one proven runtime path without applying the recovery Gates 3–8 schema directly to Production.

The reconciled target is:

`account -> request -> analysis -> scope approval -> immutable quote version -> quote acceptance -> contract draft -> explicit review evidence -> reviewed contract acceptance -> test Checkout -> signed provider verification -> payment paid while build remains pending_payment -> human fulfillment authorization -> build queue -> branch/PR/test -> Vercel Preview -> phone review -> revision decision -> delivery package -> customer acceptance`

Production release authority remains a separate owner-only gate.

## Verified live Production baseline

Current live commercial tables:

- `project_requests`
- `request_analyses`
- `project_request_events`
- `project_workflows`
- `project_quotes`
- `project_payments`
- `project_build_queue`

Production migration history was captured through `20260811213155_fix_evento_payment_event_status_v1` before the isolated branch was created.

Observed Production row counts at sprint start:

- requests: 2
- analyses: 2
- request events: 6
- workflows: 0
- quotes: 0
- payments: 0
- build queue: 0

No Production reconciliation migration has been applied.

## Reconciled source-of-truth model

The transition deliberately avoids a second writable quote/payment truth.

Compatibility headers retained:

- `project_quotes`
- `project_payments`
- `project_build_queue`

Additive evidence introduced in the isolated branch:

- `project_quote_versions`
- `project_quote_acceptances`
- `project_contract_versions`
- `project_contract_acceptances`
- `private.project_fulfillment_authorizations`

### Commercial invariants

1. Sending a quote freezes an immutable SHA-256-bound quote version.
2. Customer acceptance binds to that exact version.
3. A contract draft always starts with `legal_review_status=required`.
4. Owner/admin review evidence is required before a contract can become `approved_for_use`.
5. An unreviewed contract cannot be sent.
6. Payment preparation requires an accepted reviewed contract.
7. Browser return/success state never proves payment.
8. Verified payment changes the payment state but leaves build queue `pending_payment`.
9. Owner/admin/ops fulfillment authorization is separately required before queue state becomes `queued`.
10. Customer acceptance never grants merge, Production deployment, store submission, domain transfer, secret disclosure, or release authority.

## Source-of-truth decisions

1. `EVENTo0/EVENTo0` is canonical company/Revenue Engine source.
2. `evento-mobile` remains the current mobile/control-plane implementation and compatibility reference until reconciliation promotion is proven.
3. `AAA-prompt-empire/apps/evento-web` remains a reference/proving implementation rather than a second canonical EVENTO product.
4. Supabase is operational data/auth/workflow authority.
5. Stripe signed server-side provider state is payment truth.
6. Vercel Preview is a review channel, not Production.
7. Human approval boundaries remain outside agent authority.

## Phase status

### R0 — Contract capture — COMPLETE

Live tables, migrations, row counts and live-vs-recovery differences are captured in source and machine-readable configuration.

### R1 — Isolated Supabase environment — COMPLETE

Development branch `zgyovnqjmaognsjyylvk` was created from Production migration history with no Production business data.

### R2 — Additive commercial bridge — COMPLETE FOR TEST BRANCH

Applied only to the development branch:

- `20260811225144_evento_runtime_reconciliation_bridge_v1`
- `20260811225244_evento_runtime_reconciliation_hardening_v1`
- `20260811225610_evento_internalize_fulfillment_authorization_v1`
- `20260811230010_evento_contract_review_evidence_v1`
- `20260811230510_evento_contract_operator_visibility_v1`

### R3 — Security / negative tests — IN PROGRESS, CORE FLOW PROVEN

Rollback-only E2E evidence currently proves:

- wrong customer quote acceptance is blocked;
- payment before contract acceptance is blocked;
- contract draft cannot start already approved for use;
- unreviewed contract cannot be sent;
- owner review evidence is recorded before send;
- payment verification does not start build;
- human authorization is required before build queue promotion;
- synthetic data is rolled back.

Legacy authenticated execution of `start_project_workflow` and `approve_project_scope` is revoked in the development branch because the active mobile design uses the authenticated `workflow-transition` Edge Function.

Still required before R3 closes:

- authenticated cross-user SELECT tests using real user JWT contexts;
- anonymous commercial-transition tests through Edge Functions;
- amount/currency mismatch provider tests;
- final Security + Performance Advisor review with no unresolved high-risk blocker.

### R4 — Stripe test payment/build proof — NEXT

Required proof:

`accepted reviewed contract -> Stripe test Checkout -> signed test webhook -> project_payments=paid -> project_build_queue remains pending_payment -> owner fulfillment authorization -> project_build_queue=queued`

No live Stripe charging is part of R4.

### R5 — Real Vercel branch Preview — PENDING

Establish trusted Git linkage for the canonical EVENTO source and produce a real branch Preview from a known commit.

Phone verification must cover Arabic/English rendering, account session, own-project isolation, commercial status, Preview URL opening, and no Production mutation.

### R6 — Preview / revision / delivery proof — PENDING

Tie one exact build and Preview identity to customer feedback, revision classification, included-revision accounting, change-order boundary, delivery package, customer acceptance and separate owner release authorization.

## Mobile reconciliation

A stacked mobile branch/PR is used so EVENTO Control Plane V1 remains isolated.

Mobile target flow:

`Quote Center -> customer quote acceptance -> Contract Center draft/review/send -> customer contract acceptance -> payment -> verified payment -> human fulfillment authorization`

The isolated mobile build points to the Supabase development branch, not Production.

## Deferred Production actions

Do not perform these yet:

- merge the Supabase development branch into Production;
- apply recovery Gates 3–8 directly to Production;
- enable live Stripe charging;
- auto-start agents after payment;
- auto-merge/deploy/release;
- merge the Claude EVENTO web surface as a second canonical product;
- treat remaining anonymous warnings as harmless without a final demo/auth policy.

## Production-hardening backlog

- enable leaked-password protection before password-based Production launch;
- decide anonymous demo policy; if retained, add CAPTCHA/Turnstile and abuse controls;
- keep legacy privileged RPCs revoked when superseded by server-only transitions;
- maintain FK/RLS performance fixes found by advisors;
- add refund/support ledger and owner approval controls before commercial scale.

## Sprint completion criteria

This sprint closes only after:

- one reconciled schema path is reproducible from source;
- negative authorization/RLS suite is green;
- one test quote and reviewed contract are accepted by the correct permanent customer;
- one signed Stripe test event produces correct paid state;
- paid state does not start build;
- human fulfillment authorization promotes the queue;
- one real Vercel Preview is generated from a known EVENTO commit;
- Preview is reviewed on a physical phone;
- revision/delivery acceptance is tied to exact Preview/build identity;
- no Production schema/payment/release mutation occurred without owner review.
