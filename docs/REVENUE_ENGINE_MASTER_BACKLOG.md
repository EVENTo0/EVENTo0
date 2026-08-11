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

Status: IN PROGRESS

### 0.1 Repository authority and isolation
- [x] Reserve `EVENTo0/EVENTo0` for EVENTO company web/PWA.
- [x] Close THE ROOT PR without merge and preserve its branch for dedicated-repository migration.
- [ ] Migrate THE ROOT branch/history to a standalone repository when repository creation is available.
- [ ] Remove stale mixed-lineage references from portfolio registry after PR #19 reconciliation.

### 0.2 Reproducible web foundation
- [ ] Inventory the current `main`; it is a concept/skeleton, not a reproducible production app.
- [ ] Create a clean supported Next.js production scaffold on this branch using current official guidance.
- [ ] Pin runtime/package versions and commit lockfile.
- [ ] Arabic-first RTL + English LTR baseline.
- [ ] Add lint/typecheck/unit/build CI.
- [ ] Add browser smoke tests for core routes.

### 0.3 Vercel recovery
Current observed project: `evento-empire`.
- [ ] Reconnect the authoritative EVENTO Git repository to the Vercel project or replace the stale project deliberately.
- [ ] Confirm framework detection instead of current `framework: null` state.
- [ ] Confirm Preview vs Production environments and Git branch mapping.
- [ ] Run dry/deployment-manifest inspection where supported.
- [ ] Require lint/typecheck/test/security deployment checks before Production promotion.
- [ ] Confirm production domain strategy before public launch.
- [ ] Add runtime/error/analytics observability after the real app is deployed.

### 0.4 Supabase production security recovery
Observed production project: `jaxhaiaftpegcodkzaus`.
- [x] Existing request/analysis/event/workflow tables inventoried; all public tables currently have RLS enabled.
- [ ] Review `approve_project_scope(uuid)` SECURITY DEFINER exposure to authenticated users; prefer SECURITY INVOKER or explicit restricted execution model.
- [ ] Review `start_project_workflow(uuid)` SECURITY DEFINER exposure similarly.
- [ ] Review policies flagged as anonymous-access capable; explicitly distinguish anonymous users from authenticated human customers.
- [ ] Enable leaked-password protection in Supabase Auth settings.
- [ ] Add negative authorization tests: user A cannot read/update/approve/start user B request/workflow.
- [ ] Optimize RLS init-plan usage (`(select auth.uid())` pattern where applicable).
- [ ] Add covering indexes for workflow foreign keys if query design requires them.
- [ ] Re-run security/performance advisors after every DDL/RLS change.

### 0.5 Analyze-request function
- [x] Function is ACTIVE and manually validates bearer token/user ownership.
- [ ] Review why platform `verify_jwt` is disabled; enable native JWT verification if compatible with the intended authentication model.
- [ ] If custom auth remains necessary, add explicit contract tests for missing, malformed, publishable-key-like, expired and cross-user tokens.
- [ ] Version the analysis engine independently from customer-facing state.
- [ ] Replace heuristic-only analysis with provider-neutral AI-assisted analysis only after evaluation fixtures exist.

**Gate 0 exit:** clean source authority, reproducible web build, correct Git/Vercel linkage, P0 auth/RLS/RPC findings resolved or explicitly accepted with tests, no mixed THE ROOT source.

---

## Gate 1 — Public Company Site + Customer Identity [P0]

### Public experience
- [ ] Home: what EVENTO does, why EVENTO, trust/evidence, CTA.
- [ ] Services: websites/apps/AI automation/design/project development and clearly scoped offerings.
- [ ] Ready Projects catalog: EVENTO ventures eligible for display/sale/license.
- [ ] Case studies/portfolio with evidence rather than unverified marketing claims.
- [ ] AI Workflow page explaining the controlled process and owner review.
- [ ] About/Contact/WhatsApp/business identity.
- [ ] Privacy, Terms, service/delivery/refund boundaries.

### Account/customer model
- [ ] Email/password or approved authentication method with secure password policy.
- [ ] Customer profile; individual/company fields kept minimal.
- [ ] Customer dashboard.
- [ ] Session/logout/account recovery tests.
- [ ] Optional MFA later for sensitive/admin roles.

**Gate 1 exit:** a customer can understand EVENTO, register/sign in and reach a secure dashboard from phone and desktop.

---

## Gate 2 — Smart Project Request + AI Scoping [P0]

Leverage existing `project_requests`, `request_analyses`, `project_request_events` rather than duplicating them.

- [ ] Project type, objective, requirements, target platforms, references, budget range, desired timeline and attachments.
- [ ] Create draft → analyze → awaiting_scope lifecycle.
- [ ] AI/heuristic analysis output includes bilingual summary, assumptions, proposed scope, risks, complexity and evidence/version metadata.
- [ ] Human/owner review before a commercial scope reaches customer.
- [ ] Missing-information loop instead of guessing requirements.
- [ ] Cost/latency measurement for every AI scoping run.
- [ ] Evaluation fixtures for representative website/app/AI/design/game/client requests.

**Gate 2 exit:** a real request produces an auditable reviewed scope without exposing admin credentials or cross-customer data.

---

## Gate 3 — Quote, Pricing & Proposal [P0]

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