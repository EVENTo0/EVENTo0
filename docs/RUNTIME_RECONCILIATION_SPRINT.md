# EVENTO Runtime Reconciliation Sprint

Date: 2026-08-12
Status: ACTIVE / ISOLATED
Canonical company repository: `EVENTo0/EVENTo0`
Parent recovery branch: `evento/revenue-engine-recovery-v1`
Supabase production ref: `jaxhaiaftpegcodkzaus`

## Objective

Move EVENTO from source-complete Revenue Engine foundations toward one proven runtime path without applying the recovery Gates 3–8 schema directly to Production.

The immediate target is a disposable end-to-end proof:

`account -> request -> analysis -> scope approval -> quote -> acceptance -> verified payment evidence -> build queue -> human fulfillment authorization -> branch/PR/test -> Vercel Preview -> phone review -> revision decision -> delivery package -> customer acceptance`

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

Current Production migration history is tracked through:

- `20260811212913_evento_payment_ledger_foundation_v1`
- `20260811213124_fix_evento_payment_queue_timestamp_v1`
- `20260811213155_fix_evento_payment_event_status_v1`

Observed row counts at sprint start:

- requests: 2
- analyses: 2
- request events: 6
- workflows: 0
- quotes: 0
- payments: 0
- build queue: 0

This means there is no existing live quote/payment/build-queue data requiring financial-data migration in the first reconciliation experiment. Existing request/analysis history must still be preserved.

## Why reconciliation is required

The recovery model is deliberately richer than the live mobile/control-plane model.

### Live commercial model

- one `project_quotes` row per request
- accepted quote state stored on the quote row
- `project_payments` stores Stripe/provider payment state
- `project_build_queue` is created at quote acceptance and stays `pending_payment` until verified payment promotes it

### Recovery model

- `quotes` + immutable `quote_versions` + `quote_items` + `proposal_acceptances`
- contract/SOW version and acceptance evidence
- provider-neutral `payment_orders` + `payment_attempts` + append-only `payment_events`
- controlled fulfillment/workspace/agent records
- exact Preview versions and feedback
- revision/change-order/delivery acceptance/release authorization boundaries

Applying the recovery migrations directly to Production would create two competing commercial truths. The sprint therefore uses an additive, test-first compatibility path.

## Source-of-truth decisions for this sprint

1. `EVENTo0/EVENTo0` remains the canonical company/Revenue Engine source.
2. `evento-mobile` remains the current live mobile/control-plane implementation and the source of the deployed commercial schema until reconciliation is proven.
3. `AAA-prompt-empire/apps/evento-web` is a reference/proving implementation, not a second canonical EVENTO product.
4. Supabase is the operational data/auth/workflow authority.
5. Stripe verified webhook state is the payment truth. Browser redirects never prove payment.
6. Vercel Preview is the web review channel. Preview is not Production.
7. Customer delivery acceptance never grants merge, Production deploy, app-store submission, domain transfer, secret disclosure, or release authority.

## Reconciliation phases

### R0 — Contract capture

- freeze an evidence snapshot of live tables, columns, RLS, privileged functions, migrations and row counts;
- maintain `config/runtime-reconciliation.json` as a machine-readable map;
- keep all Production checks read-only.

Exit: live/recovery differences are explicit and testable.

### R1 — Isolated Supabase test environment

Create a Supabase development branch/test environment from the live migration history after explicit cost confirmation.

No Production DDL is part of R1.

Exit: isolated database exists and has the same migration baseline as Production.

### R2 — Additive commercial bridge

Design additive migrations that preserve the current mobile RPC/data contracts while introducing immutable evidence needed by the deeper Revenue Engine.

Preferred direction:

- retain `project_quotes` as the compatibility header during transition;
- add version/evidence structures without creating a second writable quote truth;
- retain `project_payments` as the compatibility payment summary while introducing immutable provider-event evidence only if it can be derived safely;
- retain `project_build_queue` and require an explicit human fulfillment authorization before any agent/build mutation;
- never infer contract acceptance or payment from UI state.

Exit: both mobile and canonical web can read the same test data without duplicate commercial authority.

### R3 — Security and negative tests

Required tests:

- customer A cannot read customer B request/quote/payment/build state;
- anonymous users cannot perform commercial transitions;
- permanent customer cannot create/edit price fields;
- customer cannot mark payment paid;
- unverified provider event cannot promote build queue;
- verified amount/currency mismatch cannot promote build queue;
- agent cannot self-authorize fulfillment or release;
- customer delivery acceptance cannot trigger Production release.

Re-run Supabase security and performance advisors after every DDL change.

Exit: no unresolved high-risk authorization blocker for the tested flow.

### R4 — Payment/build proof

Use Stripe test mode or another explicitly non-live test context first.

Proof:

`accepted quote -> Checkout -> signed webhook -> project_payments=paid -> project_build_queue=queued`

Then require separate owner/operator fulfillment authorization.

Exit: payment truth and build authorization are demonstrably separate.

### R5 — Real Vercel branch Preview

Establish trusted Git linkage for the canonical EVENTO source and produce a real branch Preview.

Verify from a physical phone:

- Arabic/English rendering;
- account session;
- own project only;
- quote/payment status;
- Preview URL opens on phone;
- no Production mutation from Preview.

Exit: one exact commit/build has a real phone-viewable Preview URL.

### R6 — Preview, revision and delivery proof

Connect one exact build/Preview identity to:

- customer feedback;
- operator revision classification;
- included revision entitlement accounting;
- change-order boundary;
- delivery package;
- customer acceptance;
- separate owner release authorization.

Exit: one disposable project completes the flow without bypassing any gate.

## Current blockers / deferred production actions

Do not perform these yet:

- apply recovery Gates 3–8 directly to Production;
- enable live Stripe charging;
- auto-start agents after payment;
- auto-merge/deploy/release;
- merge the Claude EVENTO web surface as a second canonical product;
- enable broad authenticated execution of legacy privileged workflow RPCs without explicit review;
- treat anonymous access warnings as harmless without deciding the final demo/auth model.

## Production-hardening backlog already observed

- enable leaked-password protection before password-based Production launch;
- decide anonymous demo policy; if retained, add CAPTCHA/Turnstile and abuse controls;
- review/revoke legacy authenticated `SECURITY DEFINER` RPC execution where superseded by server-only transitions;
- add covering index for `project_build_queue.quote_id`;
- optimize remaining RLS auth/JWT calls using initialization-plan-safe patterns;
- add refund/support ledger and owner approval controls before commercial scale.

## Sprint completion criteria

This sprint is complete only when all of the following are evidenced:

- one reconciled schema path in an isolated environment;
- negative auth/RLS suite green;
- one test quote accepted by the correct permanent customer;
- one signed test payment event produces the correct paid state;
- build queue promotion occurs only from verified payment logic;
- human fulfillment authorization remains separate;
- a real Vercel Preview is generated from a known EVENTO commit;
- the Preview is reviewed from a physical phone;
- revision/delivery acceptance is tied to the exact Preview/build identity;
- no Production schema/payment/release mutation occurred without owner review.
