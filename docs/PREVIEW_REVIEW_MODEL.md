# EVENTO Gate 7 — Phone-First Preview & Customer Review Model

Status: **Foundation / review-only**. This model does not activate Supabase Production, Vercel Production, live mobile distribution, or final delivery acceptance.

## Purpose

Gate 7 turns successful build evidence into a safe customer review surface. A customer should be able to open the latest approved Preview from a phone, inspect screenshots/short video when present, and send feedback against the exact Preview version they reviewed.

Preview is not Production. Preview is not final delivery. `approval_ready` feedback is not legal/project acceptance and never merges or deploys code.

## Exact evidence chain

A customer-visible Preview follows this chain:

`customer_project → project_preview_release → internal project_preview_binding → successful project_build_run(environment=preview) → workspace + source commit`

The customer-facing release intentionally omits repository name, branch name, provider deployment ID, raw build logs, agent assignment, credentials and Production target.

## Two-step publication

1. Create the customer-facing Preview release as `draft` and `customer_visible=false`.
2. Create the internal exact binding to a successful Gate 6 Preview build.
3. Human/operator review confirms the Preview is appropriate for customer review.
4. Only then change the release to `published`, set `customer_visible=true` and `published_at`.

The database publish-boundary trigger rejects publication if the binding is missing, the build is not successful, the build environment is not `preview`, the workspace differs, or the commit differs.

Once a release is Published, its project, request, customer, milestone, preview number, version label, platform, access mode and URL are immutable while it remains Published. A changed build or URL requires a new Preview version rather than silently replacing evidence under an existing version.

## Customer-visible tables

Customers may SELECT only their own active Published Preview data:

- `project_preview_releases`
- `project_preview_media` where `customer_visible=true`
- their own `project_preview_feedback`

Customers receive no access to `project_preview_bindings`.

## Feedback boundary

The customer may insert only:

- `preview_release_id`
- `feedback_kind`
- `body`

The private database trigger derives customer/project/request identity and resets workflow-owned fields. Feedback is accepted only for an owned, Published, visible, non-expired Preview.

Supported feedback kinds:

- `comment`
- `issue`
- `approval_ready`
- `revision_request`

`revision_request` is not automatically counted against the commercial revision entitlement. `revision_counted` remains operator-controlled and defaults to `false` so commercial policy can be applied deliberately.

## Phone-first experience

`/projects/[id]/workspace` shows:

- project status and progress;
- newest Published Preview versions first;
- platform and version label;
- safe Preview URL;
- screenshots/short video/QR media references when published;
- the customer's previous feedback for that exact version;
- a compact feedback form;
- milestones and acceptance criteria below the Preview timeline.

## Kill switches

All remain disabled by default:

- `EVENTO_PREVIEW_PUBLISH_MODE=disabled`
- `EVENTO_PREVIEW_FEEDBACK_WRITE_MODE=disabled`

The current customer page does not publish a Preview. Preview publication is an internal trusted-orchestrator/operator operation to be implemented and tested separately.

## Vercel / provider boundary

Gate 7 is provider-neutral. `project_preview_bindings.provider` can represent Vercel and other controlled Preview channels, including mobile distribution and game/demo channels.

A Vercel Preview should be created only after the authoritative Git repository is correctly linked to a Vercel project. Git-integrated non-production branches are the preferred Preview path. Vercel tokens, project IDs used as credentials, provider deployment internals and Production promotion controls must never be stored in customer-visible rows.

The existing `evento-empire` Vercel project is not treated as authoritative by this migration merely because it exists. Git linkage and Preview runtime evidence remain separate activation gates.

## Activation tests before enabling feedback

In an isolated Supabase test environment:

1. Customer A cannot see Customer B previews/media/feedback.
2. Anonymous Auth cannot read or insert.
3. Draft, expired, superseded and revoked previews are not customer-readable.
4. A Published preview without an exact binding is rejected.
5. CI builds cannot back a Preview release; only `environment=preview` can.
6. Failed/running Preview builds cannot be published.
7. Wrong workspace or commit binding is rejected.
8. Published Preview material fields cannot be silently replaced.
9. Feedback against an unowned/draft/expired Preview is rejected.
10. Customer inserts cannot set `user_id`, project identity, workflow status or `revision_counted`.
11. `approval_ready` does not mark milestone/project accepted and does not merge/deploy.
12. `revision_request` does not automatically consume the included revision.

Then rerun Supabase security/performance advisors before any Preview environment activation.
