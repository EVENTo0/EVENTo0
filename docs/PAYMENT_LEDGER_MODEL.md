# EVENTO Gate 5 — Verified Payment Ledger Model

Status: provider-neutral source foundation. No live provider activation, checkout creation, billing mutation or fulfillment is enabled.

## Core rule

A browser redirect, success page, client callback, screenshot, email or customer assertion is never authoritative payment proof.

EVENTO records an order as paid only after a server-side provider adapter has:
1. validated provider authenticity/signature;
2. normalized the provider event;
3. matched the EVENTO payment order and attempt;
4. verified amount and currency;
5. passed duplicate/idempotency checks;
6. inserted the normalized event into the internal ledger.

Only then may the private database trigger transition the payment state.

## Domain separation

### Customer-visible
- `payment_orders`
- `payment_attempts`
- `refunds`

These expose high-level state only and are RLS-owned by the permanent customer.

### EVENTO/provider-internal
- `payment_provider_attempt_details`
- `payment_events`
- `payment_provider_refund_details`

These hold provider object identifiers, idempotency fingerprints and normalized webhook evidence. Customer/browser roles receive no grants.

## Payment-order binding

Every payment order is bound to:
- customer;
- project request;
- exact accepted quote and quote version;
- exact accepted contract and contract version;
- exact contract acceptance evidence.

Payment supports `full`, `deposit`, and `milestone` order kinds, but the commercial operator must explicitly determine the plan. The ledger does not silently invent installment terms.

## State model

Payment order:
`pending → requires_action → paid → partially_refunded/refunded`

Failure/cancellation are explicit states and do not delete history.

Payment attempt:
`created → pending/requires_action → succeeded|failed|cancelled`

An order may have more than one attempt; one failed attempt must not destroy the order history.

## Provider adapter contract

Provider adapters must run server-side only.

For every provider event, adapters must supply a normalized internal record containing:
- provider (`stripe` or `tap`);
- provider event id;
- EVENTO order id;
- EVENTO attempt id when applicable;
- normalized event kind;
- currency;
- amount;
- `signature_verified` result;
- SHA-256 fingerprint of the payload used for audit;
- provider object id when needed;
- provider timestamp.

Provider secrets, webhook signing secrets and restricted/secret API keys must never be written to customer tables, client code, logs, Git or mobile binaries.

## Stripe adapter direction

For the first one-time EVENTO project payment adapter:
- use Checkout Sessions rather than legacy Charges;
- keep secret/restricted keys server-side;
- prefer a least-privilege restricted key when possible;
- omit hard-coded `payment_method_types` so payment-method configuration remains dynamic;
- verify Stripe webhook signatures before setting `signature_verified = true`;
- use the provider event id and EVENTO idempotency fingerprint to tolerate retries;
- treat Checkout redirect success as UX only, not ledger proof.

No Stripe SDK or secret is added to the web runtime in this Gate 5 foundation.

## Tap adapter direction

Tap will implement the same normalized EVENTO adapter contract:
- server-side credentials only;
- test/live isolation;
- provider authenticity/signature verification according to the current Tap integration contract before normalized success is recorded;
- amount/currency/order verification;
- provider-event idempotency;
- no fulfillment from browser redirect alone.

Provider-specific code is intentionally deferred until a Preview/test environment exists and current provider documentation is verified for the exact account configuration.

## Refund model

Refunds are append/audit-friendly business records. Provider-specific refund ids remain internal. A verified normalized refund event may move an order to `partially_refunded` or `refunded`, but cannot exceed the amount previously recorded as paid.

## Fulfillment boundary

A verified `paid` order is necessary but still not sufficient for autonomous fulfillment.

Gate 6 must separately create/authorize the controlled project workspace and agent build process. Payment verification must never directly grant agents permission to self-merge, self-deploy or alter production.

## Kill switch

`EVENTO_PAYMENT_WRITE_MODE=disabled` remains the default.

The current customer payment page is read-only. Checkout creation stays disabled until a provider adapter and Preview evidence exist.

## Activation checklist

Before any Preview payment write is enabled:
1. apply Gate 0–5 migrations in an isolated Supabase environment;
2. seed one accepted quote + accepted reviewed contract + payment order;
3. verify customer A cannot read customer B payment state;
4. verify anonymous-auth cannot read permanent-customer orders;
5. verify browser cannot INSERT/UPDATE payment orders, attempts, provider details or payment events;
6. verify an unverified provider event cannot mutate financial state;
7. verify a verified event with wrong amount, currency, provider or attempt/order binding fails;
8. verify duplicate provider event id is idempotently rejected;
9. verify a valid verified success event marks exactly one order paid;
10. verify refund cannot exceed paid amount;
11. re-run Supabase security/performance advisors;
12. implement provider sandbox adapter with server-side secrets;
13. test provider retries, delayed success/failure and browser return-page behavior;
14. verify no secret appears in client bundles/logs/Git;
15. Vercel Preview phone/desktop E2E;
16. owner review before any live-mode provider activation.
