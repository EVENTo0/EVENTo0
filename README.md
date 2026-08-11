# EVENTO Project Development — Revenue Engine

**EVENTO Project Development** is the legal company and commercial parent for the projects, products and client work developed under the EVENTO portfolio.

This repository is the authoritative GitHub source for the **EVENTO company website / PWA Revenue Engine**.

## Primary objective

Build one evidence-backed business flow:

`visitor → customer → project request → AI-assisted scope → reviewed quote → approval → payment → controlled build → phone/web preview → revision → acceptance → delivery → rating → maintenance / upsell`

EVENTO should also become the commercialization surface for eligible EVENTO ventures: ready-project catalog, demo/request/license/subscription paths, and ongoing support.

## Current stage

**Recovery → Production Track**

The legacy `main` branch contains early EVENTO concept/source material but is not yet a reproducible modern production application. Active recovery work belongs on:

`evento/revenue-engine-recovery-v1`

Do not treat a mockup, old Vercel deployment or isolated database table as production readiness.

## Connected systems

- Company web source: `EVENTo0/EVENTo0`
- Company mobile app: `EVENTo0/evento-mobile`
- Production backend: Supabase `jaxhaiaftpegcodkzaus`
- Current Vercel project: `evento-empire` (source/framework linkage is part of recovery)
- Internal engineering/R&D: `EVENTo0/AAA-prompt-empire`
- Internal phone command center: `EVENTo0/empire-mobile-control-plane`

## Repository isolation

Unrelated products must not be merged into this repository. The film project **الجذر / THE ROOT** was isolated by closing its unmerged PR and preserving its branch for migration to a standalone repository.

EVENTO ventures such as FamilyOS, EVEX, History-Med-1, OCTORIMAL/Al-Andalus and others keep their own authoritative repositories. EVENTO links to, commercializes and orchestrates them; it does not absorb their source code.

## Execution documents

Start here:

- `AGENTS.md` — repository/agent operating contract
- `docs/LIVE_SYSTEM_AUDIT_2026-08-11.md` — live GitHub/Vercel/Supabase/mobile baseline
- `docs/REVENUE_ENGINE_MASTER_BACKLOG.md` — sequential Gate 0 → Gate 11 implementation plan
- `docs/PRODUCTION_READINESS.md` — release/commercial evidence gates

## Technology policy

Use current supported production technology verified from primary documentation. Major framework/SDK/database/payment changes are project-local branches with tests, migration evidence and rollback. New Agents, Skills, MCPs and automation are adopted only when a representative trial demonstrates measurable improvement in speed, quality, security, cost, phone-first operability or time-to-market.

## Safety and approval

- branch/PR-first development;
- no agent self-approval;
- no speculative production database mutation;
- no credentials in source/client bundles;
- payment fulfillment only after server-side verified payment state;
- owner review before Production promotion, store publication or sensitive governance changes.
