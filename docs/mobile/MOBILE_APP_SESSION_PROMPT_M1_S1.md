# Session Prompt — M1/S1 (Capacitor Bootstrap)

Copy/paste this entire prompt into your coding agent to run the first implementation session.

---

You are coordinating implementation in this workspace.

## Source of Truth
- Read and follow `MOBILE_APP_PORT_HANDOFF.md`.
- Read `MOBILE_APP_MULTI_AGENT_MASTER_PROMPT.md` for process and quality bar.
- Current date: March 7, 2026.

## Session Scope (strict)
- Milestone: **M1 — Capacitor Wrapper Bootstrap**
- Session: **S1 (single mergeable slice)**
- Include only these jobs now:
  1. Add Capacitor dependencies + scripts in `client/package.json`.
  2. Add Capacitor config file(s) in `client/`.
  3. Ensure Vite output/base settings are compatible in `client/vite.config.js`.
  4. Add a concise mobile run section to `QUICKSTART.md`.
- Explicitly out of scope for this session:
  - auth/session refactors
  - notifications data model/API changes
  - reskin/theme changes
  - DM/public profile/widgets

## Execution Constraints
1. One PR-sized diff only.
2. Preserve existing browser/web behavior.
3. Keep changes additive and minimal.
4. Do not run broad refactors.
5. If a command fails, fix root cause or clearly report blocker.

## Agent Topology (parallel where safe)
- Agent A (App Shell):
  - Edit `client/package.json`, create Capacitor config, adjust `client/vite.config.js`.
- Agent B (Docs/QA):
  - Update `QUICKSTART.md` with mobile setup + run commands.
  - Validate client build still succeeds.
- Agent C (Integrator):
  - Reconcile edits, run focused validation, produce handoff block.

## Required Validation
Run these (or closest equivalents available in repo):
1. `npm install --prefix client`
2. `npm run build --prefix client`
3. If scripts were added for sync/open, run a non-destructive one (e.g., sync) and report output.

## Required Output (strict)
### 1) Session Plan
- milestone
- jobs
- lane assignments
- expected deliverables

### 2) Work Completed
- exact files changed
- what changed per file
- status per lane

### 3) Validation
- commands run
- pass/fail
- notable logs/errors

### 4) Handoff Update
Return this exact markdown block filled with real values for appending to `MOBILE_APP_PORT_HANDOFF.md`:

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

### 5) Next Session Recommendation
- Pick exactly one best next job in M1/M2 and explain why it is highest leverage.

## Quality Bar
- No placeholder code.
- No silent API contract changes.
- Keep diff reviewable and scoped.
- Do not touch unrelated server files in this session.
