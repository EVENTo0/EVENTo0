# EVENTO Phase 1 — First Customer Dry Run Readiness

Date: 2026-08-13
Branch: `evento/phase0-source-of-truth-2026-08-13`

## Objective
Prove one complete non-production commercial journey using the same architecture intended for production:

customer identity → project request → analysis → reviewed scope → quote → quote acceptance → Stripe TEST Checkout → signed webhook → paid ledger state → workflow/build queue → preview/status → revision/delivery evidence.

This phase does not authorize production traffic, domain switching, live Stripe charging or automatic build fulfillment.

## P0-A — Canonical web Preview
Owner: Web/Platform

- Deploy the reconciled EVENTO web implementation from `EVENTo0/EVENTo0`, using `evento/runtime-reconciliation-v1` or a reviewed descendant as the source.
- Do not deploy legacy `main` as the company app.
- Vercel project must deliberately map to the canonical repository and selected branch.
- Framework must be detected/configured as Next.js rather than `null`.
- Separate Preview and Production environments.
- Configure only publishable Supabase client values in browser-visible environment variables.
- Configure server-only secrets in platform secret storage.
- Run Arabic RTL + English LTR phone/desktop smoke tests.
- Record exact commit SHA + Preview URL.

Exit evidence:
- exact Git SHA;
- Vercel Preview URL;
- build success;
- browser smoke result;
- no production promotion.

## P0-B — Supabase authorization hardening
Owner: Backend/Security

Canonical project: `jaxhaiaftpegcodkzaus`.

Current advisor findings require a reviewed migration/test cycle before production use.

Required work:
- inspect/restrict `approve_project_scope(uuid)` and `start_project_workflow(uuid)` SECURITY DEFINER execution;
- verify anonymous-session behavior for `project_leads`, `project_requests`, `project_request_events`, `project_workflows`, `request_analyses`;
- enable leaked-password protection through the correct Auth configuration path;
- optimize RLS policies flagged for per-row `auth.*` evaluation;
- add covering index for `project_build_queue.quote_id` if query/use-case review confirms it;
- do not remove unused indexes only because the advisor reports them unused on a young/low-traffic system.

Mandatory negative tests:
- user A cannot read user B request;
- user A cannot update user B request;
- user A cannot approve user B scope;
- user A cannot start user B workflow;
- anonymous session cannot gain signed-in/customer privileges;
- public clients cannot invoke privileged operations outside the intended RPC/Edge Function contract.

Exit evidence:
- reviewed migration;
- non-production test result;
- security advisor rerun;
- no unresolved high-risk authorization finding relevant to the dry run.

## P0-C — Stripe TEST commercial proof
Owner: Payments

Current backend already includes `create-stripe-checkout` and `stripe-webhook`.

Dry-run sequence:
1. create test customer/account;
2. create project request;
3. analyze request;
4. produce and accept a quote;
5. call authenticated `create-stripe-checkout`;
6. complete Stripe TEST Checkout;
7. receive signed `checkout.session.completed` or supported successful async event;
8. reconcile EVENTO payment ledger from the webhook;
9. confirm amount, currency, quote/request ownership and idempotency behavior;
10. prove duplicate/replayed webhook does not double-fulfill;
11. confirm browser success redirect alone cannot mark a project paid.

Security rules:
- use separate test credentials;
- prefer a restricted Stripe key with least privilege;
- webhook secret stays server-side;
- never expose Stripe secret/restricted keys to the web or mobile client;
- no LIVE mode charge in this phase.

Exit evidence:
- test Checkout Session ID;
- EVENTO payment ID;
- verified paid ledger row;
- webhook event ID;
- duplicate/replay result;
- no production fulfillment.

## P0-D — Unified customer journey
Owner: Product/QA

Validate both web and EVENTO Mobile against the same backend contracts where supported.

Minimum journey:
- sign up/sign in;
- submit request;
- view analysis and request timeline;
- approve/review scope through allowed path;
- view/accept quote;
- complete TEST payment;
- see updated workflow/project status;
- verify build queue state is created/advanced only through intended server rules.

Record discrepancies between web and mobile instead of changing backend contracts independently.

## P0-E — Business/Owner command surface
Owner: Control Plane

Do not expand `empire-mobile-control-plane` into a second product backend.

Next owner-dashboard slice should read authoritative state and surface:
- new leads;
- requests awaiting review;
- quotes awaiting approval/customer action;
- payments paid/pending/failed;
- active workflows;
- build queue and preview links;
- failed CI/deployments;
- EVENTO Mobile release/device-acceptance status.

Source systems remain GitHub/Vercel/Supabase/Stripe. The control plane aggregates; it does not duplicate them.

## P1 — Public company completeness
After P0 dry-run gates are green:
- packaged Services pages;
- Ready Projects catalog using commercial eligibility state;
- About/Contact/WhatsApp/business identity;
- privacy/terms/service/refund/delivery boundaries;
- evidence-based portfolio/case studies;
- AI workflow explainer;
- analytics/observability;
- domain/DNS production plan through Hostinger.

## P2 — Automation expansion
Only after the dry run works:
- AI-assisted scoping with evaluation fixtures;
- automatic quote drafting with owner review;
- repository/workspace provisioning;
- AAA+ Empire agent routing;
- preview/build orchestration;
- controlled one-revision flow;
- delivery pack and aftercare upsell.

## P3 — Portfolio commercialization
Only ventures passing EVENTO Commercial Gate become sellable/listed:
- FamilyOS;
- EVEX;
- OCTORIMAL;
- History-Med-1;
- other future ventures.

## Freeze / non-interference rules
- Do not merge this audit branch automatically.
- Do not overwrite Claude branches.
- Do not change production domain or LIVE Stripe state without owner approval.
- Do not mutate Supabase production security policies directly from this plan; use reviewed migrations and verification.
- Do not promote Base44 prototypes as production source-of-truth without explicit owner decision.
- OMNIFORM remains maintenance/beta priority unless directly required by an EVENTO customer workflow.

## Phase 1 completion definition
Phase 1 is complete when a controlled test user can traverse the full commercial path from account/request to verified Stripe TEST payment and visible workflow state through an exact Vercel Preview commit, with Supabase authorization negative tests passing and no production promotion required.
