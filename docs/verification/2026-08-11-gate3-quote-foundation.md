# EVENTO Gate 3 Verification — Quote / Pricing / Proposal Foundation

Date: 2026-08-11
Branch: `evento/revenue-engine-recovery-v1`
Status: IMPLEMENTED / DATABASE ACTIVATION BLOCKED

## Implemented source

- Review-only migration: `supabase/migrations/20260811_quote_pricing_proposal_foundation.sql`
- Customer quote review: `app/projects/[id]/page.js`
- Customer quote acceptance Server Action: `app/projects/[id]/actions.js`
- Separate commercial kill switch: `EVENTO_COMMERCIAL_WRITE_MODE=disabled`
- Operator/agent authority model: `docs/QUOTE_OPERATOR_MODEL.md`
- Contract coverage: `tests/revenue-engine-contract.test.mjs`

## Data separation

Customer-readable commercial data:
- `quotes`
- `quote_versions`
- `quote_items`
- `proposal_acceptances`

EVENTO-internal economics:
- `quote_version_economics`
- `pricing_rules`

The migration gives no `authenticated` grants to internal economics/pricing tables.

## Acceptance integrity

`accept_quote_version(uuid)` requires:
- authenticated permanent customer;
- owner match;
- quote status `sent`;
- exact current version;
- non-expired version;
- item totals equal version subtotal;
- project workflow stage `scope_approved`;
- no duplicate acceptance.

Acceptance records the exact version, terms version and database-generated SHA-256 audit digest. It marks the quote accepted but does **not** mark payment as verified and does not trigger fulfillment.

## Database integrity

- quote ownership is tied to `(request_id, user_id)` from `project_requests`;
- versions are tied to the same quote/request/user tuple;
- `quotes.current_version_id` is constrained to a version belonging to the same quote;
- acceptance is tied to the exact `(quote_version, quote, request, user)` tuple;
- total AED is database-generated from subtotal - discount + tax.

## Not yet verified

The migration has not been applied to production or a Supabase test branch. Therefore the following remain activation gates:
- SQL execution on an isolated Supabase environment;
- cross-user RLS negative tests;
- stale/expired/non-current/anonymous acceptance tests against a live test database;
- Supabase security/performance advisors after migration;
- operator-generated sample quote fixture reviewed by owner;
- Vercel Preview browser/phone validation.

## Commercial boundary

Gate 3 quote acceptance is intentionally separate from Gate 5 payment verification. No browser redirect or accepted quote can authorize build fulfillment without a future server-verified payment ledger state.
