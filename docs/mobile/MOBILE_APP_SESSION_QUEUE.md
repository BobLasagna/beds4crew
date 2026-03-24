# Mobile App Session Queue (Back-to-Back)

Use this run order to execute all queued prompts with minimal context drift.

## One-Click Automation
- Run `./mobile-one-click.sh` to auto-generate the **next** prompt into `docs/mobile/MOBILE_APP_AUTORUN_PROMPT.md`, copy it to clipboard, and open it.
- Run `./mobile-one-click.sh --rate-limit` to generate a compact low-token version (prepends `MOBILE_APP_RATE_LIMIT_MODE_PROMPT.md`).
- Run `./mobile-one-click.sh --status` to check queue progress and see the next prompt.
- After each completed session, append the returned update block to `MOBILE_APP_PORT_HANDOFF.md`; this is what advances the queue.

## Ordered Sequence
1. `MOBILE_APP_SESSION_PROMPT_M1_S1.md`
2. `MOBILE_APP_SESSION_PROMPT_M1_S2.md`
3. `MOBILE_APP_SESSION_PROMPT_M2_S1.md`
4. `MOBILE_APP_SESSION_PROMPT_M2_S2.md`
5. `MOBILE_APP_SESSION_PROMPT_M3_S1.md`
6. `MOBILE_APP_SESSION_PROMPT_M3_S2.md`
7. `MOBILE_APP_SESSION_PROMPT_M4_S1.md`
8. `MOBILE_APP_SESSION_PROMPT_M4_S2.md`
9. `MOBILE_APP_SESSION_PROMPT_M5_S1.md`

## Fast Cycle Steps (Repeat Per Session)
1. Copy prompt file content and run it.
2. Apply resulting changes.
3. Append returned session update block to `MOBILE_APP_PORT_HANDOFF.md`.
4. Move immediately to the next prompt in sequence.

## If You Hit Rate Limits
- Use the low-token variant in `MOBILE_APP_RATE_LIMIT_MODE_PROMPT.md`.
- Ask for compact output only: changed files + validation + handoff block.
- Keep each session to exactly one mergeable slice.
