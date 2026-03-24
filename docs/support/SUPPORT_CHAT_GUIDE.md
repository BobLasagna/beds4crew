# Support Chat Flow Guide

This project now uses a data-driven support chat flow.

## Main files

- `client/src/pages/SupportChatPage.jsx` — chat UI and runtime logic.
- `client/src/data/supportChatFlows.json` — all dialogue trees, options, and end-of-chat solution links.

## JSON schema

Each top-level key is a topic slug (for example: `password-reset`, `cancellation`, `default`).

```json
{
  "password-reset": {
    "startNode": "start",
    "nodes": {
      "start": {
        "message": "...",
        "options": [{ "label": "...", "next": "node-id" }]
      },
      "node-id": {
        "message": "...",
        "options": [],
        "solutionLink": { "label": "...", "href": "/path-or-mailto" }
      }
    }
  }
}
```

## Authoring rules

- `startNode` must match a key inside `nodes`.
- Each `options[].next` must match an existing node key.
- Terminal nodes should set `options: []`.
- Add `solutionLink` on terminal nodes to show the final solution/action link in chat.
- `href` supports internal routes (e.g. `/cancellation`) and email links (`mailto:support@beds4crew.com`).

## How to add a new topic chat flow

1. Add a new top-level object in `supportChatFlows.json` using the support topic `slug`.
2. Define progressive nodes and follow-up options.
3. Ensure terminal nodes include `solutionLink`.
4. If no matching flow exists for a slug, chat automatically falls back to `default`.

## Quick sanity check

- Open `/support/chat?slug=password-reset&title=Password%20Help`.
- Click through options until terminal state.
- Confirm a "Recommended solution" link is shown at the end.
- Click **Start over** and verify it returns to the first message.
