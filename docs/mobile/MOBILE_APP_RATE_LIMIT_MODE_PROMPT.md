# Rate-Limit Mode Prompt (Compact Execution)

Copy/paste when you need minimal tokens per run.

---

You are executing one scoped session in this workspace.

## Inputs
- Read `MOBILE_APP_PORT_HANDOFF.md`.
- Read exactly one session prompt from `MOBILE_APP_SESSION_QUEUE.md`.

## Hard Constraints
1. Execute exactly one session prompt only.
2. Max output length: concise.
3. Do not restate background context.
4. No optional brainstorming.
5. No unrelated refactors.

## Required Output (minimal)
Return only these sections:

### Changed Files
- list only paths

### Validation
- commands run
- pass/fail

### Risks/Blockers
- short bullets

### Handoff Update
Return exactly this completed block:

```md
## Session Update — YYYY-MM-DD HH:mm (local)
- Milestone: Mx
- Jobs completed:
- Files changed:
- Validation run:
- Known issues:
- Next recommended job:
- Owner:
```

## Compression Rules
- Prefer bullets over prose.
- No code dumps unless explicitly asked.
- Keep explanations to one line per item.
