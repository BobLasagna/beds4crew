# Progressive Chat Implementation — Example Extended Flow

This example shows how to expand the `password-reset` flow with even more progressive branches.

## Before

```json
"password-reset": {
  "startNode": "start",
  "nodes": {
    "start": { "message": "...", "options": [...] },
    "check-inbox": { "message": "...", "options": [...] },
    "resolved": { "message": "...", "options": [], "solutionLink": {...} }
  }
}
```

## After (More Progressive Steps)

Adding a follow-up question for "Still missing" → deeper troubleshooting path:

```json
"password-reset": {
  "startNode": "start",
  "nodes": {
    "start": { 
      "message": "I can help with password recovery. What are you blocked on?",
      "options": [
        { "label": "Reset email not received", "next": "check-inbox" },
        { "label": "Reset link expired", "next": "expired-link" },
        { "label": "I forgot which email I used", "next": "find-account" }
      ]
    },
    "check-inbox": {
      "message": "Check spam/promotions and confirm the email address entered.",
      "options": [
        { "label": "I found it", "next": "resolved" },
        { "label": "Still missing", "next": "resend-steps" }
      ]
    },
    "resend-steps": {
      "message": "Request ONE new reset email and open it right away. Multiple requests can be confusing.",
      "options": [
        { "label": "The new email worked", "next": "resolved" },
        { "label": "Still blocked", "next": "escalate" }
      ]
    },
    "resolved": {
      "message": "Great! You're signed in.",
      "options": [],
      "solutionLink": { "label": "Read password help article", "href": "/support#faq-password-reset" }
    },
    "escalate": {
      "message": "A human agent can help verify your identity.",
      "options": [],
      "solutionLink": { "label": "Email human support", "href": "mailto:support@beds4crew.com" }
    }
  }
}
```

## Key patterns

- **Progressive branching**: Instead of `{ label: "...", options: [] }` (dead end), create intermediate nodes to ask clarifying questions.
- **Multiple terminal paths**: Different end states (resolved, escalate) can have different solution links.
- **Reuse common nodes**: If two paths converge, point them both to the same `next` node.

## Maintenance tips

1. **Avoid deep nesting**: Aim for 3-4 conversation turns max before showing a solution link.
2. **Use clear node names**: `escalate`, `resolved`, `pending`, `alternative` — helps team members understand intent.
3. **Test end-to-end**: Follow each path in the UI to confirm all options work and solutions are shown.
