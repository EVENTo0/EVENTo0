# EVENTO Gate 4 — Contract Operator Model

Status: source-design complete, activation blocked pending isolated Supabase tests and appropriate legal review of any customer-facing terms.

## Purpose

Gate 4 converts an accepted quote into an immutable, customer-visible agreement snapshot before any payment or fulfillment can begin.

The system separates:
1. commercial proposal acceptance (Gate 3),
2. contract / SOW acceptance (Gate 4),
3. verified payment (Gate 5),
4. build/fulfillment (Gate 6+).

No later gate may infer that an earlier acceptance proves the next one.

## Operator authority

EVENTO owner/operator may prepare a contract version only after the intended quote version has been accepted.

The contract snapshot may contain:
- Statement of Work;
- deliverables;
- acceptance criteria;
- revision allowance and out-of-scope handling;
- ownership / IP / license terms;
- support and maintenance terms;
- cancellation/refund terms;
- confidentiality terms;
- payment-terms summary;
- Arabic and optional English rendered terms;
- governing-law/jurisdiction fields when deliberately supplied after appropriate review.

## Legal-review boundary

The application does not choose governing law, jurisdiction, refund entitlement, IP allocation, liability language or other material legal terms automatically.

Every contract version begins with `legal_review_status = required`.

A customer acceptance is database-blocked unless the exact current version is marked `approved_for_use`.

`approved_for_use` is an operational release flag indicating that the specific template/version has received the required EVENTO review process. It is not a claim by the software that the document is legally sufficient for every customer, jurisdiction or transaction.

## Agent rules

AI/agents may:
- draft proposed SOW language from the approved scope;
- identify missing acceptance criteria;
- compare the contract snapshot with the accepted quote;
- flag inconsistent revision/support/payment terms;
- prepare bilingual draft text;
- produce a checklist for human/legal review.

AI/agents must not:
- mark their own contract `approved_for_use`;
- invent governing law or jurisdiction as a silent default;
- accept a contract on behalf of the customer;
- change the accepted quote while generating the contract;
- activate payment or fulfillment;
- interpret a contract acceptance as verified payment.

## Customer access model

Customer/browser roles receive:
- SELECT on their own visible contract agreement/version/acceptance rows;
- INSERT permission only for `contract_acceptances.agreement_version_id`.

They do not receive direct UPDATE/DELETE rights on agreements, versions or acceptances.

A private trigger validates the permanent authenticated user, exact current contract version, expiry, approved review status and accepted quote evidence. It then populates authoritative acceptance fields and computes the SHA-256 evidence hash.

## Immutable acceptance evidence

Acceptance records bind:
- contract agreement;
- exact contract version;
- customer user id;
- request;
- exact accepted quote and quote version;
- terms version;
- acceptance timestamp;
- SHA-256 digest of the material contract snapshot.

Duplicate acceptance of the same agreement/version by the same user is blocked by database uniqueness constraints.

## Activation gate

Before enabling `EVENTO_CONTRACT_WRITE_MODE=enabled` anywhere:
1. apply Gate 0, Gate 3 and Gate 4 migrations to an isolated Supabase branch/test environment;
2. create representative sent quote + accepted quote evidence + sent contract fixtures;
3. verify customer A cannot read/accept customer B contract;
4. verify anonymous-auth cannot read/accept permanent-customer contracts;
5. verify stale, expired, withdrawn and superseded contract versions fail;
6. verify `legal_review_status != approved_for_use` fails;
7. verify duplicate acceptance fails;
8. verify browser cannot set user_id, quote ids, terms version, hash or accepted_at;
9. verify acceptance creates the intended project event but does not create any payment/fulfillment state;
10. re-run Supabase security and performance advisors;
11. test UI in Vercel Preview on phone and desktop;
12. owner review before any production activation.

## Next gate

Gate 5 introduces a provider-neutral payment ledger with server-verified provider events. Contract acceptance is a prerequisite, not payment proof.
