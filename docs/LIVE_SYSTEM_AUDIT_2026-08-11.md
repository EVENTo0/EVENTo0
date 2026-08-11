# EVENTO Live System Audit — 2026-08-11

Purpose: establish one evidence-backed baseline before rebuilding the Revenue Engine.

## 1. GitHub source

Authoritative company web repository: `EVENTo0/EVENTo0`.

Observed `main` state:
- README describes the intended EVENTO company platform and technology direction.
- The latest company implementation commit is from 2025-04-06 and adds a landing-page concept as a single non-standard filename rather than a reproducible Next.js project structure.
- No current CI workflow/build evidence is attached to the company `main` baseline.
- Therefore `main` is treated as a product concept/source-recovery baseline, not a production-ready application.

### THE ROOT isolation

The unrelated THE ROOT storyboard implementation existed only in PR #1 / branch `claude/film-storyboard-generator-JBdhF`; it was never merged to `main`.

Action completed 2026-08-11:
- PR #1 closed without merge.
- PR retitled `ARCHIVED — THE ROOT storyboard pipeline (move to dedicated repository)`.
- Branch/history preserved until dedicated repository migration is possible.

## 2. EVENTO Mobile

Authoritative repository: `EVENTo0/evento-mobile`.

Known engineering evidence from its current RC6 line includes static analysis, tests, Android APK build, package/version/signing verification and artifact upload. The next required gate is physical-device acceptance and a stable-toolchain/release-channel audit; production publication is not implied.

Current repository documentation is insufficient (`README.md` currently contains only the repository title), so a later company-app documentation hardening slice is required.

## 3. Supabase production backend

Project ref: `jaxhaiaftpegcodkzaus`.

### Existing public data model

Observed tables:
- `project_requests` — 2 rows; RLS enabled.
- `request_analyses` — 2 rows; RLS enabled.
- `project_request_events` — 6 rows; RLS enabled.
- `project_workflows` — 0 rows; RLS enabled.

Existing request status enum:
`draft → analyzed → awaiting_scope → quoted → approved → building → review → delivered / cancelled`

This is a useful early backbone for the Revenue Engine and should be extended rather than replaced casually.

### Auth/storage observations

- Supabase Auth already contains test/current user/session state.
- Storage currently has zero buckets; secure project-delivery storage is not implemented yet.

### P0 security findings from Supabase advisor

1. `public.approve_project_scope(uuid)` is a `SECURITY DEFINER` function executable by `authenticated` users.
2. `public.start_project_workflow(uuid)` is a `SECURITY DEFINER` function executable by `authenticated` users.
3. Policies on `project_requests`, `request_analyses`, `project_request_events` and `project_workflows` were flagged as allowing anonymous-access policy paths; authorization intent needs explicit review and negative tests.
4. Leaked-password protection is disabled in Supabase Auth.

These findings block public commercial readiness until corrected or explicitly proven safe.

### Performance findings

- `project_workflows` has foreign-key paths without covering indexes.
- `project_workflows_select_own` re-evaluates auth context per row and should be reviewed for the `(select auth.uid())` optimization pattern where semantics permit.
- Some indexes are currently unused; do not remove them based on a low-traffic baseline alone.
- Auth uses an absolute connection allocation rather than percentage-based scaling; revisit before scale-up.

### Edge Function: `analyze-request`

Observed:
- ACTIVE, version 2.
- platform setting `verify_jwt: false`.
- function code manually requires a bearer token, rejects token forms resembling publishable keys, calls `admin.auth.getUser(token)`, checks request ownership, validates allowed request states, then invokes an analysis-finalization RPC.
- admin credential is server-side only.

Assessment:
The function is not an unauthenticated free-for-all, but disabling native JWT verification creates a custom-auth contract that must be justified and regression-tested. Prefer native JWT verification if it supports the intended flow; otherwise retain custom verification only with explicit negative tests and narrow administrative RPC permissions.

## 4. Vercel live project

Observed Vercel team includes project `evento-empire`.

Current project facts:
- project exists and has one observed Production deployment in READY state;
- Vercel project reports `framework: null`;
- Vercel project reports `live: false`;
- configured Node line is 24.x;
- only one deployment was returned in the current live inventory.

Assessment:
A READY historical deployment is not evidence that the current GitHub EVENTO source is connected, reproducible or commercially live. The Git integration/source mapping and framework detection must be recovered deliberately before using this project as the public Revenue Engine.

## 5. Production-readiness conclusion

Current evidence supports this classification:

- Company/business concept: VERIFIED as intended direction.
- GitHub company source: RECOVERY REQUIRED.
- Supabase request-analysis foundation: PARTIALLY VERIFIED.
- Supabase commercial security posture: BLOCKED by P0 review items.
- Vercel project/deployment: PARTIALLY VERIFIED but source linkage/reproducibility UNVERIFIED.
- EVENTO Mobile: BETA engineering evidence; physical-device acceptance pending.
- End-to-end customer revenue journey: NOT YET IMPLEMENTED.

## 6. Immediate sequence

1. Keep THE ROOT isolated — completed.
2. Recover a clean current web application on `evento/revenue-engine-recovery-v1`.
3. Reconcile that source with Vercel Preview before Production.
4. Prepare Supabase security/RLS/RPC migration and negative tests; do not mutate production speculatively.
5. Implement customer identity/intake on top of existing request tables.
6. Extend state model to quote/proposal/payment/project/review/delivery/maintenance using reviewed migrations.
7. Verify one real end-to-end customer journey before commercial launch claims.