# Session Prompt — M3/S2 (Client Notification Service Integration)

Copy/paste this entire prompt into your coding agent.

---

You are coordinating implementation in this workspace.

## Source of Truth
- Read `MOBILE_APP_PORT_HANDOFF.md` and `MOBILE_APP_MULTI_AGENT_MASTER_PROMPT.md`.
- Current date: March 7, 2026.

## Session Scope (strict)
- Milestone: **M3 — Notification Foundation**
- Session: **S2 (single mergeable slice)**
- Include only:
  1. Refactor client unread polling into a notification service layer.
  2. Wire global badge/snackbar updates via shared service.
  3. Keep polling fallback active and stable.
- Primary file targets:
  - `client/src/components/NavigationDrawer.jsx`
  - `client/src/components/AppSnackbar.jsx`
  - new/updated notification utility modules

## Agent Topology
- Agent A (Client Service): notification abstraction.
- Agent B (UI Wiring): badge/snackbar integration.
- Agent C (Integrator): regression checks and handoff.

## Required Validation
1. `npm run build --prefix client`
2. Validate no regressions in nav/unread behavior.

## Required Output
1) Session Plan, 2) Work Completed, 3) Validation, 4) Handoff Update, 5) Next Session Recommendation.

```md
## Session Update — YYYY-MM-DD HH:mm (local)
- Milestone: M3
- Jobs completed:
- Files changed:
- Validation run:
- Known issues:
- Next recommended job:
- Owner:
```
