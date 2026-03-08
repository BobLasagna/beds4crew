# Session Prompt — M1/S2 (Native Projects + Sync Flow)

Copy/paste this entire prompt into your coding agent.

---

You are coordinating implementation in this workspace.

## Source of Truth
- Read and follow `MOBILE_APP_PORT_HANDOFF.md`.
- Read `MOBILE_APP_MULTI_AGENT_MASTER_PROMPT.md` for process and quality bar.
- Current date: March 7, 2026.

## Session Scope (strict)
- Milestone: **M1 — Capacitor Wrapper Bootstrap**
- Session: **S2 (single mergeable slice)**
- Include only these jobs now:
  1. Initialize and sync Capacitor native projects (iOS + Android) from current client output.
  2. Add npm scripts for sync/open/build-mobile workflows in `client/package.json`.
  3. Document simulator/device run flow and common bootstrap troubleshooting in `QUICKSTART.md`.
  4. Keep web build/start behavior unchanged.
- Explicitly out of scope:
  - auth/session changes
  - notifications feature work
  - reskin/theme edits

## Agent Topology
- Agent A (App Shell): native init/sync and scripts.
- Agent B (Docs): quickstart updates.
- Agent C (Integrator): conflict resolution, validation, handoff block.

## Required Validation
1. `npm install --prefix client`
2. `npm run build --prefix client`
3. `npm run <new-mobile-sync-script> --prefix client` (or equivalent)

## Required Output
1) Session Plan, 2) Work Completed, 3) Validation, 4) Handoff Update block, 5) Next Session Recommendation.

Use this handoff block format:

```md
## Session Update — YYYY-MM-DD HH:mm (local)
- Milestone: M1
- Jobs completed:
- Files changed:
- Validation run:
- Known issues:
- Next recommended job:
- Owner:
```
