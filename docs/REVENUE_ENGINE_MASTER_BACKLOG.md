# EVENTO Revenue Engine — Master Backlog

Baseline date: 2026-08-11
Operating goal: make EVENTO capable of completing the first real customer journey end-to-end, then use the same system to commercialize EVENTO ventures and serve external clients.

## Definition of the first commercial success

A real customer can:
1. discover EVENTO and understand services/portfolio;
2. create an account and submit a project request;
3. receive an AI-assisted but reviewed scope and quote;
4. approve scope/terms and pay through a verified payment flow;
5. see project status and preview links on phone/web;
6. request the allowed revision and approve final delivery;
7. receive controlled deliverables/source/handoff;
8. rate the service and select maintenance/aftercare;
9. leave an auditable EVENTO record from request through delivery.

## Gate 0 — Revenue Engine Recovery [P0]

Status: IMPLEMENTATION COMPLETE / ACTIVATION BLOCKED

### 0.1 Repository authority and isolation
- [x] Reserve `EVENTo0/EVENTo0` for EVENTO company web/PWA.
- [x] Close THE ROOT PR without merge and preserve its branch for dedicated-repository migration.
- [ ] Migrate THE ROOT branch/history to a standalone repository when repository creation is available.
- [x] Reconcile the portfolio registry so EVENTO web is authoritative rather than mixed/triage source.

### 0.2 Reproducible web foundation
- [x] Inventory legacy `main` as concept/skeleton rather than reproducible production app.
- [x] Create a supported Next.js App Router production scaffold using current official guidance.
- [x] Pin runtime/package versions and commit generated lockfile.
- [x] Arabic-first responsive baseline.
- [x] Add contract/build CI.
- [ ] Add browser-level smoke tests after Preview URL exists.

Current verified tuple:
- Node.js 24 LTS line;
- Next.js 16.2.11;
- React / React DOM 19.2.0;
- `@supabase/ssr` 0.12.4;
- `@supabase/supabase-js` 2.111.0.

### 0.3 Vercel recovery
Current observed project: `evento-empire`.
- [ ] Reconnect the authoritative EVENTO Git repository to the Vercel project or replace the stale project deliberately.
- [ ] Confirm framework detection instead of current `framework: null` state.
- [ ] Confirm Preview vs Production environments and Git branch mapping.
- [x] Commit `vercel.json` with explicit Next.js framework and Node 24 runtime intent.
- [ ] Require test/security deployment checks before Production promotion.
- [ ] Confirm production domain strategy before public launch.
- [ ] Add runtime/error/analytics observability after the real app is deployed.

Observed blocker: connected Vercel project still reports `framework: null` and `live: false`; current connector does not expose a safe project/Git-link mutation for this repository, so no deployment is being claimed.

### 0.4 Supabase production security recovery
Observed production project: `jaxhaiaftpegcodkzaus`.
- [x] Existing request/analysis/event/workflow tables inventoried; public business tables have RLS enabled.
- [x] Inspect live `approve_project_scope(uuid)` SECURITY DEFINER definition and ownership checks.
- [x] Inspect live `start_project_workflow(uuid)` definition and EVENTO Mobile dependency.
- [x] Prepare review-only migration adding permanent-user restrictions, explicit RPC authorization, RLS optimization and covering indexes.
- [ ] Apply/test the migration on an isolated Supabase branch or equivalent safe environment.
- [ ] Enable leaked-password protection in Supabase Auth settings.
- [ ] Add live negative authorization tests: user A cannot read/update/approve/start user B request/workflow.
- [ ] Re-run security/performance advisors after migration application.

### 0.5 Analyze-request function
- [x] Function is ACTIVE and manually validates bearer token/user ownership.
- [x] Web project request action integrates the existing `analyze-request` function without exposing privileged keys.
- [ ] Review whether native JWT verification can replace the custom bearer verification without breaking the current client flow.
- [ ] Add live negative tests for missing/malformed/expired/cross-user tokens in a non-production environment.
- [ ] Replace heuristic-only analysis with provider-neutral AI-assisted analysis only after evaluation fixtures exist.

**Gate 0 exit:** repository/build/reproducibility portion is complete. Full exit remains blocked on real Vercel Preview linkage plus tested Supabase hardening/authorization evidence.

---

## Gate 1 — Public Company Site + Customer Identity [P0]

Status: IMPLEMENTED / PREVIEW + LIVE AUTH VALIDATION PENDING

### Public experience
- [x] Home: EVENTO value proposition, services, Revenue Engine journey and ventures positioning.
- [x] Mobile-responsive Arabic-first layout.
- [x] Clear project-request CTA.
- [ ] Full Services pages and packaged offers.
- [ ] Ready Projects catalog with commercial eligibility state.
- [ ] Case studies/portfolio with evidence rather than unverified marketing claims.
- [ ] AI Workflow explainer page.
- [ ] About/Contact/WhatsApp/business identity.
- [ ] Privacy, Terms, service/delivery/refund boundaries.

### Account/customer model
- [x] Email/password sign-up and sign-in server actions.
- [x] Email confirmation callback with safe redirect handling.
- [x] Supabase SSR cookie/session refresh using Next.js Proxy.
- [x] Permanent-user check rejects anonymous sessions from customer project routes.
- [x] Customer dashboard reads owned requests/workflows/analyses via RLS.
- [x] Logout action.
- [ ] Live password/reset/recovery UX tests in Preview.
- [ ] Optional MFA later for sensitive/admin roles.

**Gate 1 exit:** implementation exists and builds. Exit remains blocked until Preview is connected and customer Auth is validated end-to-end against the intended environment.

---

## Gate 2 — Smart Project Request + AI Scoping [P0]

Status: IMPLEMENTED BEHIND WRITE KILL-SWITCH

Leverages existing `project_requests`, `request_analyses`, `project_request_events`, `project_workflows` rather than duplicating them.

- [x] Project type, title/objective and detailed requirements intake.
- [x] Persistent server action implemented using the customer's Supabase session and RLS.
- [x] Production write kill-switch `EVENTO_REQUEST_WRITE_MODE=disabled` by default.
- [x] New request invokes the existing authenticated `analyze-request` function when writes are enabled.
- [x] Customer dashboard shows lifecycle/progress/analysis summary.
- [x] Project detail shows bilingual analysis, proposed scope, risks and engine version.
- [x] Project timeline reads `project_request_events`.
- [x] Start-workflow and scope-approval actions reuse the EVENTO Mobile-compatible RPC contract.
- [x] Scope actions are also protected by permanent-user validation + write kill-switch.
- [ ] Add budget range, desired timeline, references and attachments after storage policy design.
- [ ] Add owner/human-review state before a commercial scope reaches the customer as final.
- [ ] Add missing-information loop instead of guessing requirements.
- [ ] Record cost/latency for every future model-backed scoping run.
- [ ] Add representative evaluation fixtures before replacing heuristic analysis.

**Gate 2 exit:** implementation is ready but activation remains blocked until Supabase hardening is tested and the write kill-switch is deliberately enabled in a non-production Preview environment first.

---

## Gate 3 — Quote, Pricing & Proposal [P0]

Status: NEXT IMPLEMENTATION SLICE

New domain required; design migration before production mutation.

Suggested entities:
- `quotes`
- `quote_versions`
- `quote_items`
- `pricing_rules` (internal/admin-only)
- `proposal_acceptances`

Required behavior:
- [ ] AED as primary currency; other currencies only if intentionally supported.
- [ ] Estimate vs binding/final quote states are explicit.
- [ ] Line items: discovery/design/build/integration/deployment/support/add-ons.
- [ ] Discount and tax fields with clear policy; do not silently assume tax collection configuration.
- [ ] Valid-until/expiry and quote versioning.
- [ ] Customer accepts a specific immutable quote version.
- [ ] Admin override is audited.
- [ ] Gross-margin estimate: expected revenue minus project-variable delivery/AI/hosting/payment/support costs.

**Gate 3 exit:** approved scope generates a versioned customer-facing quote with an auditable acceptance action.

---

## Gate 4 — Terms, Contract & Project Approval [P0]

- [ ] Link quote to service terms/project statement of work.
- [ ] Explicit ownership/IP/license terms by project type.
- [ ] Revision allowance and out-of-scope change policy.
- [ ] Delivery/acceptance criteria and cancellation/refund conditions.
- [ ] Customer acceptance timestamp, actor, document/version hash.
- [ ] For client projects, create repository/workspace only after commercial approval or explicit pre-sales authorization.

**Gate 4 exit:** EVENTO can prove exactly what the customer approved before build/payment fulfillment.

---

## Gate 5 — Payment & Financial Ledger [P0]

Provider architecture: keep a provider-neutral EVENTO payment domain with Stripe/Tap adapters rather than scattering provider IDs across product tables.

Suggested entities:
- `payment_orders`
- `payment_attempts`
- `payment_events`
- `refunds`
- `invoices` / invoice references

Stripe direction:
- one-time project payments: Checkout Sessions by default;
- recurring maintenance/subscriptions: Billing + Checkout Sessions;
- server-side restricted keys where possible;
- dynamic payment methods rather than hard-coded `payment_method_types`;
- webhook signature verification + idempotent processing.

Tap direction:
- test/live keys separated server-side;
- idempotency reference;
- webhook hash/signature verification;
- Retrieve Charge/server-side verification before fulfillment.

Cross-provider rules:
- [ ] browser redirect is never authoritative payment proof;
- [ ] payment event ledger is append/audit friendly;
- [ ] duplicate webhook/retry tests;
- [ ] amount/currency/order ownership verification;
- [ ] partial/deposit/milestone payment model decided explicitly;
- [ ] refunds/cancellations represented as state, not deleted history;
- [ ] production fulfillment blocked until verified payment state.

**Gate 5 exit:** test-mode E2E proves request/quote → verified payment → correct project state without double fulfillment.

---

## Gate 6 — Project Workspace & Agent Build Orchestration [P1]

- [ ] Create `customer_projects` record after approved commercial gate.
- [ ] Link project to authoritative GitHub repository/workspace and deployment targets without storing credentials client-side.
- [ ] Generate project brief, acceptance criteria, architecture, plan and owner decisions.
- [ ] Route work through AAA+ Empire with project-local branch/PR permissions.
- [ ] Agents can prepare work; they cannot self-approve/merge/production-deploy.
- [ ] Track milestones, builds, tests, blockers, previews, costs and evidence.
- [ ] Client project data and EVENTO internal lab data remain separated.

**Gate 6 exit:** one approved customer project can be created and advanced by controlled agents with auditable branch/PR/build evidence.

---

## Gate 7 — Phone-First Preview & Customer Status [P1]

- [ ] Customer dashboard timeline and percent/stage sourced from real workflow evidence.
- [ ] Vercel Preview or appropriate build artifact attached to milestone.
- [ ] Mobile app and web portal share the same backend project truth.
- [ ] Safe temporary preview/share behavior.
- [ ] Customer comments/questions tied to milestone/revision.
- [ ] No production deployment implied by a preview URL.

**Gate 7 exit:** customer can safely review the actual in-progress work from a phone and EVENTO can trace feedback to a build/version.

---

## Gate 8 — Revision & Acceptance [P1]

Suggested entities:
- `review_rounds`
- `review_comments`
- `change_requests`
- `acceptances`

- [ ] Included revision count/policy derives from contract.
- [ ] Out-of-scope changes trigger change order/requote rather than silent scope creep.
- [ ] Acceptance is bound to a specific deliverable/build/version.
- [ ] Rejection requires structured reason and next action.
- [ ] Owner/operator can see pending client decisions from phone.

**Gate 8 exit:** EVENTO can complete one revision cycle and capture final acceptance unambiguously.

---

## Gate 9 — Secure Delivery & Handoff [P1]

Storage is currently empty; design controlled buckets/policies before customer files are uploaded.

- [ ] private delivery bucket(s), owner/project-scoped RLS/storage policies;
- [ ] deliverable metadata/checksums/version/provenance;
- [ ] source/repository handoff policy where included;
- [ ] credentials never uploaded as normal deliverable files;
- [ ] asset/font/library license/provenance report where applicable;
- [ ] signed or auditable delivery acknowledgement;
- [ ] retention/deletion/export policy.

**Gate 9 exit:** customer receives the exact accepted artifacts through a controlled delivery path with an auditable handoff record.

---

## Gate 10 — Rating, Support, Maintenance & Upsell [P1]

- [ ] Post-delivery rating/review.
- [ ] Maintenance plans: monthly/annual/project-based.
- [ ] Support tickets and severity/SLA model.
- [ ] Renewal/expiry reminders.
- [ ] Change/enhancement requests can generate a new quote/work order.
- [ ] Analytics: lead → request → quote → paid → delivered conversion, average cycle time, gross margin, revision rate, support load.

**Gate 10 exit:** delivered work becomes recurring relationship/revenue rather than a dead project record.

---

## Gate 11 — EVENTO Venture Commercialization [P1/P2]

For FamilyOS, EVEX, History-Med-1, OCTORIMAL/Al-Andalus, Aetheris, AithenaX and future ventures:
- [ ] product is Beta with its own technical evidence;
- [ ] Commercial Gate complete;
- [ ] demo/preview linked to EVENTO catalog;
- [ ] commercial model selected: fixed sale / license / subscription / custom deployment / service package / investment-ready IP;
- [ ] price and estimated gross margin tracked;
- [ ] ownership/licensing terms explicit;
- [ ] support/update policy defined;
- [ ] EVENTO checkout/request flow routes to the correct commercial model.

Preferred commercialization order after EVENTO core readiness:
1. FamilyOS
2. EVEX Mobile / EVEX product family
3. History-Med-1
4. strategic game vertical slices where evidence supports a demo/commercial decision
5. recovered/paused ventures.

---

## Operating metrics

Track these from the first real customer:
- lead-to-request conversion;
- request-to-reviewed-scope time;
- scope-to-quote time;
- quote acceptance rate;
- payment conversion/failure rate;
- time-to-first-preview;
- total delivery cycle time;
- revision count and out-of-scope change rate;
- delivery acceptance time;
- customer rating;
- support/maintenance attach rate;
- variable AI/build/hosting/payment/support cost per project;
- estimated and realized gross margin.

## Rule for adding new tools/agents

A proposed tool/agent/skill/MCP must document a baseline and one measurable expected gain. Promote it to standard EVENTO practice only after a representative project trial and regression evidence. Otherwise it remains an experimental scout in AAA+ Empire.
