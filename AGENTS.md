# EVENTO Revenue Engine — Operating Contract

Status: recovery / production-track candidate
Owner: EVENTO Project Development
Repository authority: this repository is the authoritative GitHub source for the EVENTO company web/PWA Revenue Engine.

## Business identity

EVENTO Project Development is the legal company and commercial parent. This repository exists to operate the company itself: customer acquisition, project requests, scoping, quoting, approvals, payments, delivery, customer acceptance, support, maintenance and commercialization of EVENTO ventures.

This repository is NOT:
- a home for unrelated products, films or experiments;
- the AAA+ engineering lab;
- a copy of product repositories such as FamilyOS, EVEX, OCTORIMAL or History-Med-1;
- permission for agents to mutate sibling repositories.

THE ROOT is explicitly excluded. Its closed archival PR/branch must be migrated to a dedicated repository before development resumes.

## Authoritative connected systems

- Web source: `EVENTo0/EVENTo0`
- Mobile app: `EVENTo0/evento-mobile`
- Supabase production project: `jaxhaiaftpegcodkzaus`
- Vercel project currently associated with EVENTO: `evento-empire`
- Internal engineering/R&D: `EVENTo0/AAA-prompt-empire`
- Portfolio/mobile operations: `EVENTo0/empire-mobile-control-plane`

The web repository, mobile repository, production database and internal engineering systems remain separate sources of truth for their own concerns.

## Primary business journey

The product must eventually support one auditable end-to-end journey:

`visitor → lead/customer → project request → AI-assisted scope → reviewed proposal/quote → approval → payment → project workspace/build → phone/web preview → revision → acceptance → delivery → rating → maintenance/upsell`

Do not claim a stage complete without applicable evidence.

## Execution priorities

1. Recover a reproducible current web application and Git/Vercel linkage.
2. Close P0 Supabase security/auth/RLS/RPC findings before public commercial release.
3. Implement customer intake/auth and a clear services/venture catalog.
4. Make scope/quote/approval state machine authoritative and auditable.
5. Add payment ledger and provider adapters with verified webhooks/idempotency.
6. Connect build orchestration to project-local GitHub repositories without giving EVENTO web broad repository write privileges.
7. Provide phone-first preview/status/revision/acceptance.
8. Add secure deliverables, handoff, ratings, support and maintenance.
9. Productize EVENTO ventures only after their own Beta + Commercial Gate.

## Agent and skill routing

Use the smallest qualified set. Preferred roles from AAA+ Empire:
- `portfolio_operator` for company/portfolio state;
- `technology_intelligence` for current framework/platform/security verification;
- web/product specialists for the site/customer portal;
- backend/data specialists for Supabase/schema/RLS;
- security specialist for auth, RLS, payments and secrets;
- build/distribution specialist for previews/artifacts;
- QA/performance/accessibility specialists before release;
- capability curator only for improvements proven reusable across projects.

A new Agent, Skill, MCP or provider feature is not adopted because it is new. It must demonstrate a measurable improvement in speed, quality, security, cost, phone-first operability or time-to-market.

## Write and approval boundaries

- All implementation work is branch/PR-first.
- No agent may self-approve or silently merge.
- No production database mutation from speculative work.
- No store publication or production promotion without owner review.
- No secrets in source, logs, client bundles, reports or portfolio registry.
- Cross-repository work requires separate scoped PRs in each authoritative repository.
- Customer project ownership and delivery boundaries must be explicit before code generation begins.

## Production evidence gates

At minimum, applicable gates include:
- current supported framework/runtime and committed lockfile;
- lint/typecheck/tests/build;
- preview deployment and phone/browser acceptance;
- auth/session/RLS negative tests;
- Supabase security/performance advisor review after DDL changes;
- payment test-mode E2E, webhook signature verification and idempotency;
- accessibility and Arabic RTL/English LTR verification;
- performance/reliability and error monitoring;
- privacy/legal/store requirements;
- backup/rollback/recovery evidence;
- owner approval.

## Commercial Gate

No EVENTO venture moves from Beta to Production/Commercial merely because it builds. Required business evidence includes:
- target customer and value proposition;
- pricing/revenue model;
- estimated delivery/hosting/AI/payment/support cost;
- expected gross margin or strategic rationale;
- demo and acceptance evidence;
- analytics/measurement plan;
- privacy/legal/store/payment readiness;
- support/maintenance plan;
- packaging/licensing/ownership terms.

## Definition of done

Completion means the current evidence supports the claimed business stage. A mockup, generated codebase, successful compile, isolated database table, Vercel URL or agent statement alone is not a completed commercial workflow.