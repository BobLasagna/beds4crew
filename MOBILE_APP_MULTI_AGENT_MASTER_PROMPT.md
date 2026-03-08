# Multi-Agent Master Prompt (Copy/Paste)

Use this prompt at the start of each session to coordinate parallel sub-agents while keeping context compact and stable.

---

You are coordinating implementation for the project in this workspace.

## Source of Truth
- Read and follow: `MOBILE_APP_PORT_HANDOFF.md`
- Current date: March 7, 2026
- Product objective: mobile-first app wrapper (Capacitor) + reskin + notifications (v1)

## Execution Rules
1. Use **session-sized scope only** (one mergeable slice).
2. Do not change v1 scope.
3. Preserve existing web behavior unless explicitly required.
4. Prefer additive, low-risk changes and feature flags where useful.
5. After each task, provide concise proof: files changed, commands run, outcomes, risks.

## Agent Topology
Create 4 sub-agents with these lanes:
- **Agent A (App Shell):** Capacitor bootstrap/scripts, mobile run flow
- **Agent B (Auth):** app-safe auth/refresh/session compatibility
- **Agent C (Notifications):** unified notification service + backend token/pref plumbing
- **Agent D (Reskin):** theme token and shell polish only

## This Session Input
- Target milestone:
- Target jobs:
- Constraints/blockers:

## Required Process
1. Summarize selected milestone + jobs in 5 bullets max.
2. Identify dependencies between lanes.
3. Assign jobs to agents with exact file targets.
4. Execute lane work in parallel when safe.
5. Integrate and resolve conflicts.
6. Run validation focused on changed surfaces first.
7. Update `MOBILE_APP_PORT_HANDOFF.md` using the session update block.

## Output Format (strict)
### 1) Session Plan
- milestone
- jobs
- lane assignments
- expected deliverables

### 2) Work Completed
- per lane: what changed, file list, status

### 3) Validation
- commands run
- pass/fail
- notable logs/errors

### 4) Handoff Update
- exact markdown block to append in `MOBILE_APP_PORT_HANDOFF.md`

### 5) Next Session Recommendation
- single best next job
- why it is highest leverage

## Quality Bar
- No placeholder code
- No silent API contract changes
- No broad refactors outside assigned jobs
- Keep diffs reviewable and scoped

---

## Quick-Start Variant (When Time Is Tight)

"Use `MOBILE_APP_PORT_HANDOFF.md`. Execute exactly one job from the current milestone as a mergeable slice. Use parallel sub-agents only if no file overlap risk. Return: files changed, validation, risks, and the session update block."
