# EVENTO Gate 6 — Project Workspace & Agent Build Orchestration

Status: source-design complete; activation blocked pending isolated Supabase tests, verified payment sandbox evidence, owner review and real repository provisioning controls.

## Purpose

Gate 6 converts an explicitly authorized paid customer engagement into a controlled build workspace. It does **not** treat a successful payment as permission for an agent to begin work automatically.

The control chain is:

`verified payment → human fulfillment authorization → customer project → milestones/criteria → workspace provisioning → limited agent assignment → branch/PR/test evidence → human approval request`

Production merge/deploy remains outside agent authority.

## 1. Fulfillment authorization

`fulfillment_authorizations` is internal-only.

Required conditions before a project-start authorization can be recorded:
- the exact `payment_order` is `paid`;
- the verified paid amount equals the amount due;
- the order has not been refunded;
- the same accepted contract/request/customer binding still exists;
- an `auth.users` operator is recorded as `authorized_by_user_id`;
- an owner/operator review note is present;
- `authorization_scope` is explicit (`project_start` or `milestone_start`).

A deposit or milestone payment never silently implies full-project authorization. The operator chooses the authorization scope deliberately.

`EVENTO_FULFILLMENT_WRITE_MODE=disabled` remains the default application kill switch.

## 2. Customer-visible project truth

Customers may read only:
- `customer_projects`;
- customer-visible `project_milestones`;
- customer-visible `project_acceptance_criteria`.

They do not receive browser grants to repository/workspace mappings, internal agent assignments, work items, CI/build internals, approval queues or orchestration audit events.

The first customer UI is `/projects/[id]/workspace` and is read-only.

## 3. Workspace model

`project_workspaces` stores references only; never credentials.

Supported roles include primary/web/mobile/backend/game/design/data/content. A workspace can record:
- provider;
- repository full name;
- visibility;
- default branch;
- working-branch prefix;
- provisioning state;
- operator who created the binding;
- owner approval/provisioning timestamps.

Repository creation and Git/Vercel/Supabase provisioning are separate explicit actions. Merely inserting a workspace row does not prove a repository exists.

## 4. Agent capability boundary

`project_agent_assignments` permits only limited build capabilities such as:
- prepare changes;
- create a working branch;
- commit to the working branch;
- open a pull request;
- run tests;
- create Preview evidence;
- request human approval.

The database permanently constrains these capabilities to `false` for every agent assignment:
- approve pull request;
- merge;
- production deploy;
- billing changes;
- contract changes;
- scope changes.

Changing those limits requires a new reviewed architecture decision rather than flipping a row value.

## 5. Work and build evidence

`project_work_items` records the task, milestone, assigned agent, working branch and acceptance snapshot.

`project_build_runs` accepts only `ci` or `preview` environments. It cannot represent a production deployment. Each run can bind:
- commit SHA;
- workspace;
- external run ID;
- build status;
- test summary;
- security summary.

Gate 7 will expose safe Preview artifacts/URLs separately rather than leaking internal build metadata directly.

## 6. Human approval queue

Agents can create `project_approval_requests` for sensitive next actions such as merge, production deploy, release, scope/cost/contract changes or destructive actions.

An approval is not complete until an `auth.users` human/operator identity and decision timestamp are recorded. Agents cannot decide their own approval request through the capability model.

Recommended GitHub repository protection for actual customer repositories:
- require pull requests before merge;
- require status checks;
- require an approving reviewer other than the latest pusher where practical;
- dismiss stale approvals when new code is pushed for high-risk repositories;
- prevent force pushes to protected branches;
- keep production deployment credentials outside agent runtime.

## 7. No-self-approval rule

An agent may prepare evidence and request a decision. It may not:
- approve its own work;
- merge its own PR;
- bypass required checks;
- mark a failed build as accepted;
- alter quote/contract/payment state;
- provision or deploy production by itself;
- grant itself broader permissions.

## 8. Activation evidence required

Before `EVENTO_FULFILLMENT_WRITE_MODE` can be enabled even in Preview/test:
1. Gate 0–6 migrations apply cleanly in an isolated Supabase environment;
2. a verified paid test order exists through a sandbox provider adapter;
3. negative tests prove unpaid/refunded/mismatched orders cannot authorize fulfillment;
4. cross-user/anonymous access tests remain blocked;
5. agent capability constraints reject merge/approve/production flags;
6. a test customer project can be created once from one authorization;
7. milestone and acceptance-criteria RLS exposes only the customer-safe rows;
8. workspace/agent/build/approval internal tables remain unreadable to browser roles;
9. GitHub repository protection/ruleset strategy is verified for the chosen customer repo model;
10. owner reviews the evidence.

## 9. What Gate 6 does not do

Gate 6 does not:
- create real customer repositories automatically;
- expose GitHub credentials;
- deploy production;
- mark a project delivered;
- publish Preview URLs to customers yet;
- allow agent self-approval;
- bypass Gate 5 verified payment or Gate 4 contract evidence.

Those actions remain controlled by later gates and explicit operator decisions.
