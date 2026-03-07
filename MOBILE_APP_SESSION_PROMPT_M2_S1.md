# Session Prompt — M2/S1 (Client App-Mode Auth Abstraction)

Copy/paste this entire prompt into your coding agent.

---

You are coordinating implementation in this workspace.

## Source of Truth
- Read `MOBILE_APP_PORT_HANDOFF.md` and `MOBILE_APP_MULTI_AGENT_MASTER_PROMPT.md`.
- Current date: March 7, 2026.

## Session Scope (strict)
- Milestone: **M2 — App-Safe Auth Session Layer**
- Session: **S1 (single mergeable slice)**
- Include only:
  1. Add runtime app/web detection and transport abstraction in `client/src/utils/api.js`.
  2. Keep browser cookie+CSRF path as default for web.
  3. Add app-mode token handling hooks/interfaces only (no broad UI rewrite).
- Out of scope:
  - server auth route changes
  - notification features
  - reskin updates

## Agent Topology
- Agent A (Client Auth): implement app/web transport layer.
- Agent B (QA): focused tests for login/session API calls.
- Agent C (Integrator): ensure no web regressions and produce handoff.

## Required Validation
1. `npm run build --prefix client`
2. Run targeted client checks for auth-related calls or existing tests/lint.

## Required Output
1) Session Plan, 2) Work Completed, 3) Validation, 4) Handoff Update, 5) Next Session Recommendation.

```md
## Session Update — YYYY-MM-DD HH:mm (local)
- Milestone: M2
- Jobs completed:
- Files changed:
- Validation run:
- Known issues:
- Next recommended job:
- Owner:
```
