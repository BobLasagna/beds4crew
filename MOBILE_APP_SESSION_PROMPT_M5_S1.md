# Session Prompt — M5/S1 (Stabilization + Launch Checklist)

Copy/paste this entire prompt into your coding agent.

---

You are coordinating implementation in this workspace.

## Source of Truth
- Read `MOBILE_APP_PORT_HANDOFF.md` and `MOBILE_APP_MULTI_AGENT_MASTER_PROMPT.md`.
- Current date: March 7, 2026.

## Session Scope (strict)
- Milestone: **M5 — Stabilization + Launch Checklist**
- Session: **S1 (single mergeable slice)**
- Include only:
  1. Regression pass for app wrapper, auth, navigation, notifications, booking-critical paths.
  2. Update deployment/runbook docs for app flow.
  3. Capture known issues + post-v1 backlog pointers.
- Primary files expected:
  - `DEPLOYMENT_GUIDE.md`
  - `PRODUCTION_DEPLOYMENT.md`
  - `MOBILE_APP_PORT_HANDOFF.md`

## Agent Topology
- Agent A (QA): regression matrix and results.
- Agent B (Docs): deployment/runbook updates.
- Agent C (Integrator): finalize checklist and handoff block.

## Required Validation
1. Run available client/server build or lint commands.
2. Confirm no high-severity regressions in critical paths.

## Required Output
1) Session Plan, 2) Work Completed, 3) Validation, 4) Handoff Update, 5) Next Session Recommendation.

## Extra notes
default notification sounds in settings, how to run demo, ionicframework account, integrate local secure ai, create steps for developer exactly what to do next

```md
## Session Update — YYYY-MM-DD HH:mm (local)
- Milestone: M5
- Jobs completed:
- Files changed:
- Validation run:
- Known issues:
- Next recommended job:
- Owner:
```
