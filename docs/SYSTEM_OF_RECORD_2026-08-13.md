# EVENTO System of Record — 2026-08-13

## Purpose
Freeze the current operating map for EVENTO Project Development so Claude, Codex/ChatGPT, GitHub, Vercel, Supabase, Stripe, Hostinger and Base44 do not create competing sources of truth.

## Company authority
- Legal/commercial parent: EVENTO Project Development.
- Primary operating objective: first paying customer completed end-to-end.
- Company-facing scope: websites, apps and games; Arabic/RTL first-class.
- Production/domain/store publication remains owner-approved only.

## Repository authority
### Company web / PWA / Revenue Engine
Canonical repository: `EVENTo0/EVENTo0`.

Important branch state:
- `main`: legacy concept/skeleton only; not the production app.
- `evento/revenue-engine-recovery-v1`: reproducible Next.js Revenue Engine foundation.
- `evento/runtime-reconciliation-v1`: current reconciled implementation baseline and parent of this audit branch.
- `claude/film-storyboard-generator-JBdhF`: separate Claude venture work; not company-web authority.
- `evento/phase0-source-of-truth-2026-08-13`: audit/governance overlay only; no production-code changes.

Do not overwrite active Claude work. New company implementation should reconcile into the authoritative EVENTO branch through reviewed PRs.

### EVENTO mobile
Canonical repository: `EVENTo0/evento-mobile`.
Current engineering line has RC6 build evidence and GitHub Actions phone-install handoff. Device acceptance and production distribution remain separate gates.

### Owner control plane
Canonical repository: `EVENTo0/empire-mobile-control-plane`.
Current repository is initialized but not yet the business command center. Its next role is to surface EVENTO business + engineering state, not replace product repositories.

### Engineering OS
- `EVENTo0/AAA-prompt-empire`: capability/orchestration layer.
- `EVENTo0/AAA-prompt`: core engineering baseline.
These do not become the EVENTO product source repository.

### Design capability
`EVENTo0/omniform-nexus-professor-ai` remains isolated/opt-in. Keep beta/maintenance priority unless EVENTO needs production design services immediately.

## Backend authority
Canonical Supabase project: `Evento project 1`
Project ref: `jaxhaiaftpegcodkzaus`
Observed status: ACTIVE_HEALTHY.

Observed live business tables include:
- `project_leads`
- `project_requests`
- `request_analyses`
- `project_request_events`
- `project_workflows`
- `project_quotes`
- `project_payments`
- `project_build_queue`

All observed public business tables have RLS enabled.

Observed active Edge Functions:
- `analyze-request`
- `workflow-transition`
- `quote-action`
- `create-stripe-checkout`
- `stripe-webhook`

This means the live backend already covers much more than the older backlog status suggested: lead/request, scope analysis, quote, payment ledger, workflow and build-queue primitives exist.

## Payment authority
Stripe is the current implemented one-time payment provider path.

Observed implementation:
- server-side Checkout Sessions;
- Stripe API version `2026-06-24.dahlia`;
- `integration_identifier` set;
- restricted key preferred with secret-key fallback;
- payment metadata tied to EVENTO payment/quote/request IDs;
- signed webhook verification with timestamp tolerance;
- server-side reconciliation through EVENTO RPC state.

Browser redirect is not authoritative payment proof; webhook/state reconciliation remains the fulfillment authority.

## Deployment authority
Observed Vercel project: `evento-empire` (`prj_VADG7rLUi2wocIqoyjkCUlhaoDfD`).

Observed state on 2026-08-13:
- framework: null;
- live: false;
- latest deployment: READY, target production, but stale relative to current EVENTO implementation;
- therefore it is not accepted as the official company production site.

Required next action is to link/recreate a deliberate EVENTO company deployment from the authoritative repository/branch, then validate Preview before any Production promotion.

## Hostinger authority
Hostinger remains the domain/email/hosting control point owned by EVENTO. Do not duplicate domain authority into Vercel or Base44. Exact live domain/DNS mapping is not asserted in this audit because it was not available through the connected tools used here.

## Base44 authority
Base44 is prototyping/UX experimentation unless explicitly promoted by owner decision. A Base44 copy must not silently become the latest EVENTO source of truth outside GitHub.

## Claude + Codex operating rule
Preferred flow:
1. Claude or Codex implements on an isolated branch in the canonical repository.
2. GitHub PR + CI captures the change.
3. Preview validates the exact commit.
4. Owner approves production/domain/payment-affecting promotion.
5. Merge/promotion occurs only after evidence gates pass.

No agent self-approval or silent production promotion.

## Current security blockers before commercial traffic
Supabase advisors currently report items that must be resolved/tested before production customer traffic, including:
- signed-in execution exposure on legacy/public SECURITY DEFINER RPCs (`approve_project_scope`, `start_project_workflow`);
- anonymous-access policy warnings on several business tables;
- leaked-password protection disabled;
- RLS init-plan performance warnings;
- one unindexed build-queue foreign key.

These are P0 hardening work. Do not solve them directly in production without a reviewed migration and non-production negative authorization tests.

## Current operating decision
The current source-of-truth stack is:

EVENTO company → `EVENTo0/EVENTo0`
EVENTO mobile → `EVENTo0/evento-mobile`
Owner control plane → `EVENTo0/empire-mobile-control-plane`
Backend → Supabase `jaxhaiaftpegcodkzaus`
Payments → Stripe server-side Checkout + webhook ledger
Web/app previews → Vercel after deliberate canonical linking
Domain/email → Hostinger
Build agents → Claude + Codex through GitHub branches/PRs
Engineering intelligence → AAA-prompt-empire
Prototype-only surface → Base44 unless explicitly promoted

## Next gate
The next program is **EVENTO Phase 1 — First Customer Dry Run Readiness**.

Do not add major new platform scope before these four blockers are cleared:
1. authoritative EVENTO Preview deployed from the reconciled company branch;
2. Supabase security migration tested with cross-user negative tests;
3. Stripe TEST end-to-end request → accepted quote → Checkout → signed webhook → paid state;
4. phone/web customer journey validated against the same Supabase project.
