# Session Prompt — M2/S2 (Server Auth Compatibility Hardening)

Copy/paste this entire prompt into your coding agent.

---

You are coordinating implementation in this workspace.

## Source of Truth
- Read `MOBILE_APP_PORT_HANDOFF.md` and `MOBILE_APP_MULTI_AGENT_MASTER_PROMPT.md`.
- Current date: March 7, 2026.

## Session Scope (strict)
- Milestone: **M2 — App-Safe Auth Session Layer**
- Session: **S2 (single mergeable slice)**
- Include only:
  1. Ensure refresh/auth routes cleanly support app-mode bearer/body fallback without breaking cookie web flow.
  2. Validate middleware behavior for both Authorization and cookie paths.
  3. Add minimal docs note describing app auth compatibility behavior.
- Primary files expected:
  - `server/routes/auth.js`
  - `server/middleware/auth.js`
  - `server/utils/tokenHelpers.js`
  - One relevant doc file

## Agent Topology
- Agent A (Server Auth): route + middleware hardening.
- Agent B (Validation): focused route-level checks.
- Agent C (Integrator): merge, regressions, handoff.

## Required Validation
1. `npm run dev --prefix server` (or project-equivalent server validation)
2. Run any available lint/test command for server.
3. Verify web auth flow assumptions still hold.

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
