# Session Prompt — M4/S2 (Shell/Nav Consistency Sweep)

Copy/paste this entire prompt into your coding agent.

---

You are coordinating implementation in this workspace.

## Source of Truth
- Read `MOBILE_APP_PORT_HANDOFF.md` and `MOBILE_APP_MULTI_AGENT_MASTER_PROMPT.md`.
- Current date: March 7, 2026.

## Session Scope (strict)
- Milestone: **M4 — Reskin Pass**
- Session: **S2 (single mergeable slice)**
- Include only:
  1. Tighten shell spacing/layout for mobile in nav surfaces.
  2. Normalize component variant usage on top-level shell surfaces only.
  3. Avoid new components or feature additions.
- Primary files:
  - `client/src/components/NavigationDrawer.jsx`
  - `client/src/App.css`
  - minimal shell-adjacent styling files if required

## Agent Topology
- Agent A (Layout): spacing and responsive shell polish.
- Agent B (Consistency): variant normalization checks.
- Agent C (Integrator): compile/regression + handoff.

## Required Validation
1. `npm run build --prefix client`
2. Manual notes for core route shell consistency.

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
