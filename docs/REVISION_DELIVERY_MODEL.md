# EVENTO Gate 8 — Revision Control & Delivery Acceptance Model

Status: **Foundation / review-only**. Gate 8 does not activate Production Supabase changes, live billing, repository merge, Production deployment, store submission, domain transfer, or credential transfer.

## Purpose

Gate 8 converts exact Gate 7 Preview feedback into a controlled commercial/engineering decision and then into an auditable delivery package.

The core separation is:

`Preview feedback ≠ included revision ≠ change order ≠ delivery acceptance ≠ release authority`

## Revision classification

Every revision case is derived from one exact `project_preview_feedback` row and remains bound to the Preview version the customer actually reviewed.

An EVENTO operator/reviewer classifies the request as one of:

- `included_revision` — consumes an available revision only when explicitly counted/authorized;
- `warranty_fix` — correction of agreed behavior/defect, not automatically charged as a revision;
- `change_order_required` — outside the accepted commercial scope; requires a separate quote/payment path;
- `no_change` — clarification, duplicate, already satisfied, or rejected request.

The customer and Agents cannot classify their own feedback or consume revision entitlement.

## Revision entitlement

`project_revision_policies` snapshots the revision policy associated with the exact accepted contract version. The included revision count is operator-controlled and atomically incremented only when an `included_revision` is explicitly counted.

The policy is not silently inferred from generic business defaults. Contract-specific terms remain authoritative.

A counted included revision cannot later be silently marked unused. Corrections to entitlement accounting require an explicit audited remediation path rather than changing history invisibly.

## Change-order boundary

A revision classified `change_order_required` may create one `project_change_order`.

The change order does not invent price or payment truth. It must use the existing reviewed commercial layers:

`revision case → change order → reviewed quote/version → accepted commercial evidence → verified payment order`

A change order cannot become `paid` without separate quote/version/payment references.

## Delivery package

A customer delivery package is created from one exact Published Gate 7 Preview and contains immutable customer-facing snapshots:

- deliverables;
- acceptance criteria;
- support/maintenance summary;
- handoff summary;
- safe artifact references;
- package SHA-256.

Delivery artifacts may reference source bundles, documentation, app builds, design exports, deployment references or credential-handoff instructions. **Secret values, passwords, tokens and provider credentials must never be stored in customer-visible delivery rows.**

## Delivery readiness

A package may become `ready_for_acceptance` only when:

1. the source Preview belongs to the same customer/project and remains Published/visible/non-expired;
2. no revision case remains open;
3. no unresolved/unpaid change order remains open;
4. all customer-visible acceptance criteria are `passed` or formally `waived`;
5. the package is explicitly made customer-visible with a ready timestamp.

An accepted package becomes immutable in its material identity/snapshots/hash.

## Customer delivery acceptance

The browser may submit only `delivery_package_id`.

Private database logic derives and freezes:

- customer/project/request identity;
- exact package SHA-256;
- acceptance timestamp.

Acceptance is rejected for the wrong customer, a package not Ready, open revisions/change orders, or unsatisfied acceptance criteria.

## Release authority remains separate

Customer delivery acceptance **does not** merge code, deploy Production, submit an app store build, transfer a domain, or expose credentials.

`project_release_authorizations` is internal-only. Approval requires a registered active EVENTO owner/operator and an already accepted delivery package.

Agents may request release approval but cannot approve their own release or receive bypass authority.

## Customer route

`/projects/[id]/delivery` is the phone-first customer delivery surface. It should show only safe revision/change-order status, the current delivery package, safe handoff artifacts and existing acceptance evidence.

It must never expose:

- repository names/branches;
- raw build logs;
- provider secrets or deployment credentials;
- agent assignments/internal approval queues;
- secret values.

## Default-off gates

- `EVENTO_REVISION_WRITE_MODE=disabled`
- `EVENTO_DELIVERY_ACCEPTANCE_WRITE_MODE=disabled`

Gate 8 customer acceptance may be enabled only in a reconciled Preview/test environment after database negative tests.

## Activation test matrix

Before generating/applying a real Supabase migration:

1. reconcile the live Production schema with the recovery model;
2. generate the migration using `supabase migration new` in an isolated branch/worktree;
3. verify migration ordering with `supabase migration list`;
4. Customer A cannot view/accept Customer B delivery;
5. anonymous Auth cannot read/accept;
6. customer cannot self-classify revision or set `revision_counted`;
7. entitlement cannot exceed the contract policy limit;
8. change-order work cannot start from an unpaid change order;
9. delivery cannot become Ready from Draft/expired/wrong Preview;
10. open revision/change order blocks Ready/acceptance;
11. failed acceptance criteria block Ready/acceptance;
12. accepted package material fields are immutable;
13. customer can insert only `delivery_package_id`;
14. customer acceptance cannot create/approve release authorization;
15. release approval requires an active EVENTO owner/operator;
16. customer-visible artifact rows cannot contain secret values;
17. rerun Supabase security/performance advisors.

## Current Production schema drift

The connected Production project currently has an independently evolved commercial path using `project_quotes`, `project_payments`, and `project_build_queue`. Gates 3–8 on the recovery branch use a deeper versioned model. Therefore the Gate 8 SQL lives under `supabase/review/` and is intentionally not a Production migration until the two models are reconciled in an isolated environment.
