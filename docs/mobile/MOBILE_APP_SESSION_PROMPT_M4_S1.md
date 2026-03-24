# Session Prompt — M4/S1 (Theme Token Reskin Pass)

Copy/paste this entire prompt into your coding agent.

---

You are coordinating implementation in this workspace.

## Source of Truth
- Read `MOBILE_APP_PORT_HANDOFF.md` and `MOBILE_APP_MULTI_AGENT_MASTER_PROMPT.md`.
- Current date: March 7, 2026.

## Session Scope (strict)
- Milestone: **M4 — Reskin Pass**
- Session: **S1 (single mergeable slice)**
- Include only:
  1. Update theme tokens and typography scale for mobile readability.
  2. Keep existing IA/routes/components intact.
  3. Ensure dark/light parity in token system.
- Primary files:
  - `client/src/contexts/ThemeContext.jsx`
  - `client/src/utils/styleConstants.js`

## Agent Topology
- Agent A (Theme): token and typography updates.
- Agent B (Parity QA): dark/light checks.
- Agent C (Integrator): compile + handoff.

## Required Validation
1. `npm run build --prefix client`
2. Verify visual parity notes for dark/light and mobile breakpoints.

## Required Output
1) Session Plan, 2) Work Completed, 3) Validation, 4) Handoff Update, 5) Next Session Recommendation.

```md
## Session Update — YYYY-MM-DD HH:mm (local)
- Milestone: M4
- Jobs completed:
- Files changed:
- Validation run:
- Known issues:
- Next recommended job:
- Owner:
```
