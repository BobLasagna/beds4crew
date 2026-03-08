# Session Prompt — M3/S1 (Notification Data + Token Registration)

Copy/paste this entire prompt into your coding agent.

---

You are coordinating implementation in this workspace.

## Source of Truth
- Read `MOBILE_APP_PORT_HANDOFF.md` and `MOBILE_APP_MULTI_AGENT_MASTER_PROMPT.md`.
- Current date: March 7, 2026.

## Session Scope (strict)
- Milestone: **M3 — Notification Foundation**
- Session: **S1 (single mergeable slice)**
- Include only:
  1. Add/extend server-side notification preference + device token data shape.
  2. Add endpoint(s) for app push token registration/unregistration.
  3. Keep email preference behavior backward-compatible.
- Out of scope:
  - full client notification UI refactor
  - reskin changes

## Agent Topology
- Agent A (Backend Model/API): schema + routes.
- Agent B (Contract Docs): request/response examples.
- Agent C (Integrator): validation + handoff.

## Required Validation
1. `npm run dev --prefix server` (or equivalent)
2. Route-level verification for registration/unregistration and preference reads/writes.

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
