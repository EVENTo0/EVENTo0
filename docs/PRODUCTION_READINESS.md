# EVENTO Production & Commercial Readiness

A feature or project moves forward only when the evidence required for that stage exists.

## Web/PWA release gate

- Current supported framework/runtime selected from primary documentation.
- Dependency lockfile committed and supply-chain review completed.
- Lint/typecheck/unit/integration/browser smoke tests pass.
- Arabic RTL and English LTR critical journeys pass on phone and desktop.
- Accessibility review covers keyboard, labels, contrast, focus, motion and responsive behavior.
- Vercel Preview is tied to the exact Git commit under review.
- Production promotion is separate from Preview acceptance.
- Runtime errors/logging/analytics are configured before commercial traffic.
- Rollback path is identified and tested where practical.

## Supabase release gate

- Schema change exists as a reviewed migration, not an undocumented production edit.
- RLS enabled on exposed tables.
- Data API grants and RLS are both intentionally configured.
- Cross-customer/role negative tests pass.
- `SECURITY DEFINER` functions are minimized, non-public where possible, and execution grants are explicit.
- No authorization decision relies on user-editable metadata.
- Security and performance advisors are reviewed after DDL/RLS changes.
- Backup/recovery implications are documented.

## AI scoping gate

- Provider/model can be changed without corrupting business state.
- Prompt/model/version/evaluation metadata is recorded.
- Representative request fixtures cover website, mobile, automation/AI, design and complex custom work.
- Hallucinated requirements do not silently become contractual scope.
- Human/owner review separates AI analysis from customer-facing approved proposal.
- Cost/latency/error rate is measurable.

## Payment gate

- Test and live credentials are separate and server-side.
- EVENTO owns a provider-neutral order/payment ledger.
- Browser redirects are informational, not fulfillment proof.
- Webhook authenticity is verified.
- Handlers are idempotent and retry-safe.
- Amount, currency, customer/order ownership and payment status are verified server-side.
- Duplicate webhook and replay tests pass.
- Refund/cancellation states preserve audit history.
- Production fulfillment requires verified payment state.
- Tax/registration behavior is explicitly configured rather than assumed.

## Project build/orchestration gate

- Customer-approved scope/quote/version is fixed before standard build starts.
- Project-local GitHub repository/workspace is authoritative.
- Agents operate on branches/PRs with least privilege.
- Acceptance criteria and required evidence are defined before implementation.
- CI/build/preview artifacts link back to commit/branch.
- No agent self-merges or widens credentials.
- Out-of-scope requests trigger change-control/requote.

## Delivery gate

- Acceptance is tied to a named build/deliverable/version.
- Deliverables are stored privately with project/customer access boundaries.
- Asset/library/font/source provenance is available where applicable.
- Credentials/secrets are transferred using a secure channel, not ordinary project files.
- Handoff/ownership/license terms match the accepted contract.
- Customer acknowledgement is auditable.

## Maintenance/aftercare gate

- Maintenance scope, cadence and price are explicit.
- Support severity/SLA and communication route are defined.
- Renewals/expiry are trackable.
- Enhancement work becomes a new approved work order when outside maintenance scope.
- Support effort and attach rate feed gross-margin analysis.

## EVENTO Venture Commercial Gate

Before FamilyOS, EVEX, History-Med-1, OCTORIMAL/Al-Andalus or another EVENTO venture is listed as commercially available, require:

- own technical Beta evidence;
- demo/preview suitable for the target customer;
- target customer and value proposition;
- commercial model: sale, license, subscription, custom deployment, service package or strategic IP;
- price and variable-cost estimate;
- expected gross margin or documented strategic reason if margin is not primary;
- privacy/legal/store/payment readiness;
- analytics and success metrics;
- support/update/maintenance policy;
- ownership/IP/license terms;
- owner approval to move to Production/Commercial.

## Evidence states

Use only:
- `UNVERIFIED`
- `PARTIALLY VERIFIED`
- `VERIFIED`
- `BLOCKED`
- `UNLINKED`

Never upgrade the label because a task is planned or an agent says it is complete. Evidence must correspond to the current artifact/configuration.