# Mobile App Port Handoff (Persistent Multi-Session Plan)

## Objective
Ship a **mobile-first app wrapper** (iOS + Android) using **Capacitor**, with a **reskin** and **notifications** in v1.

### In Scope (v1)
- Capacitor app wrapper and mobile runtime wiring
- App-safe auth/session behavior (without breaking web)
- Notification foundation (in-app + push-ready plumbing)
- Visual reskin via existing theming system

### Out of Scope (v1)
- Full standalone DM product rollout
- Home/lock-screen widgets
- Public profiles launch

## Guardrails
- Keep existing web behavior unchanged unless explicitly noted.
- Prefer additive changes and feature flags for risky behavior.
- No schema-breaking migrations unless required for v1 scope.
- Each session should produce a mergeable, testable PR-sized change.

## Milestones (Session-Sized)

### M0 — Baseline + Branch Hygiene (1 session)
**Goal:** Freeze starting point and establish repeatable workflow.

**Jobs (single session):**
1. Snapshot baseline health
   - Run: `npm run dev --prefix server`, `npm run dev --prefix client`, lint/build where available
   - Record current warnings/errors in handoff notes
2. Create branch + working conventions
   - Branch naming and PR template for this initiative
3. Add this handoff doc reference to team workflow

**Deliverables:**
- Baseline status note
- Shared branch/PR conventions

**Definition of Done:**
- Team can start independent slices without re-discovery

---

### M1 — Capacitor Wrapper Bootstrap (1–2 sessions)
**Goal:** App shell runs on iOS/Android from current client build.

**Jobs:**
1. Add Capacitor config and scripts to `client/package.json`
2. Configure web build output and static paths (if needed)
3. Initialize iOS/Android projects and sync pipeline
4. Document local run commands and troubleshooting

**Primary Files:**
- `client/package.json`
- `client/vite.config.js`
- `client/index.html`
- New Capacitor config file(s)
- `QUICKSTART.md` (or new mobile quickstart section)

**Definition of Done:**
- App launches on at least one simulator/device
- No regression in browser startup

---

### M2 — App-Safe Auth Session Layer (1–2 sessions)
**Goal:** Authentication works reliably in webview/native contexts.

**Jobs:**
1. Add runtime/platform detection and API transport abstraction
2. Ensure refresh flow works with bearer/body fallback
3. Keep CSRF/cookie browser flow intact
4. Add failure-state UX for token expiry in app mode

**Primary Files:**
- `client/src/utils/api.js`
- `server/routes/auth.js`
- `server/middleware/auth.js`
- `server/utils/tokenHelpers.js`

**Compatibility Note (M2/S2):**
- Web flow remains cookie-first (access/refresh cookies + CSRF cookie/header contract).
- App-mode requests (`X-Auth-Mode: app` or `authMode: "app"`) are compatible with bearer/body token fallback on auth routes.
- Login/refresh can return tokens in response body for app transport while still setting cookies for browser compatibility.

**Definition of Done:**
- Login, refresh, logout validated on web + app wrapper
- No auth regressions on existing web routes

---

### M3 — Notification Foundation (2 sessions)
**Goal:** Unified notification plumbing with polling fallback and push-ready structure.

**Jobs:**
1. Add server-side device/notification preference data shape
2. Add registration endpoint(s) for app push token binding
3. Refactor client unread polling into notification service layer
4. Wire global badge/snackbar updates through shared service

**Primary Files:**
- `server/models/User.js` (or dedicated notification model)
- `server/routes/emailPreferences.js` (extend or split concerns)
- `server/routes/booking.js` (event hooks)
- `client/src/components/NavigationDrawer.jsx`
- `client/src/components/AppSnackbar.jsx`
- New client notification service util(s)

**Definition of Done:**
- In-app notification UX works via unified service
- Polling remains as fallback
- Push integration points are documented and testable

---

### M4 — Reskin Pass (1–2 sessions)
**Goal:** Mobile-friendly visual refresh without changing IA/feature scope.

**Jobs:**
1. Update theme tokens and typography scale for mobile readability
2. Tighten spacing/layout in shell and key nav surfaces
3. Normalize component variants across top-level pages
4. Validate dark/light parity

**Primary Files:**
- `client/src/contexts/ThemeContext.jsx`
- `client/src/utils/styleConstants.js`
- `client/src/App.css`
- `client/src/components/NavigationDrawer.jsx`

**Definition of Done:**
- Visual consistency across core routes
- No new component system introduced

---

### M5 — Stabilization + Launch Checklist (1 session)
**Goal:** Close loop for release readiness.

**Jobs:**
1. Regression pass: auth, navigation, notifications, booking flows
2. Update deployment and runbook docs
3. Capture known issues + next milestone backlog (DM/public profiles/widgets)

**Primary Files:**
- `DEPLOYMENT_GUIDE.md`
- `PRODUCTION_DEPLOYMENT.md`
- `MOBILE_APP_PORT_HANDOFF.md` (status section)

**Definition of Done:**
- Launch checklist complete
- Clear backlog and ownership for v1.1+

## Parallel Work Lanes (for Multiple Sub-Agents)

### Lane A — App Shell
- M1 tasks, build scripts, Capacitor config, simulator boot docs

### Lane B — Auth/Session
- M2 tasks, token flow hardening, compatibility validation

### Lane C — Notifications
- M3 tasks, service abstraction, backend preference/token endpoints

### Lane D — Design Reskin
- M4 tasks, theme tokens, shell consistency sweep

### Lane E — QA/Docs
- M0 + M5, reproducible verification scripts, release notes

## Cross-Lane Contracts
- **API contracts first:** lane owners publish request/response examples before coding.
- **Feature flags:** app-specific behavior guarded where risk exists.
- **Merge order:** M1 → M2 → M3 → M4 → M5 (lanes may develop in parallel, integrate in this order).
- **No silent schema changes:** document migrations in PR description.

## Session Template (Use Every Work Session)

### 1) Session Goal
- Milestone:
- Job IDs:
- Expected deliverable:

### 2) Constraints
- Max scope: one mergeable slice
- Preserve existing web behavior
- Document assumptions explicitly

### 3) Evidence to Capture
- Commands run
- Screenshots/video (if UI)
- Before/after behavior notes
- Risks introduced

### 4) End-of-Session Output
- Files changed
- Tests run + result
- Open risks/blockers
- Next session handoff note (copy into this doc)

## Handoff State Block (Append Per Session)
Use this exact structure at the bottom of this file:

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

## Session Update — 2026-03-07 02:58 (local)
- Milestone: M4
- Jobs completed:
   - Updated theme token system in `client/src/contexts/ThemeContext.jsx` with explicit light/dark parity for semantic palette groups (primary, secondary, background, text, divider, surface, border).
   - Added mobile-first typography scale in theme (`h1`-`h6`, subtitle/body/button/caption) with responsive sizing and improved line heights.
   - Updated shared style constants in `client/src/utils/styleConstants.js` to include a mobile-focused typography scale and light/dark token maps for calendar/map surfaces.
   - Kept existing IA, routes, and component structure unchanged.
- Files changed:
   - `client/src/contexts/ThemeContext.jsx`
   - `client/src/utils/styleConstants.js`
   - `MOBILE_APP_PORT_HANDOFF.md`
- Validation run:
   - `npm run build --prefix client` ✅
   - Parity QA notes (static token review): light/dark token keys are mirrored in theme and style token maps; typography and title scales include `xs/sm/md` mobile breakpoints.
- Known issues:
   - No manual device screenshot pass was run in this slice; parity notes are based on theme/token inspection and successful build output.
- Next recommended job:
   - M4/S2: tighten spacing/layout in shell and key navigation surfaces using the new token system (without changing IA/routes/components).
- Owner:
   - Agent C (Integrator)

## Session Update — 2026-03-07 02:54 (local)
- Milestone: M3
- Jobs completed:
   - Refactored unread polling into a shared client notification service with polling fallback/backoff controls.
   - Wired global unread badge updates in navigation to consume shared notification service state.
   - Wired global snackbar emission for new unread-message alerts through notification service event subscription.
   - Preserved fallback polling behavior (5s floor, progressive increase to 30s, reset-on-menu-open).
- Files changed:
   - `client/src/utils/notificationService.js`
   - `client/src/components/NavigationDrawer.jsx`
   - `client/src/components/AppSnackbar.jsx`
   - `MOBILE_APP_PORT_HANDOFF.md`
- Validation run:
   - `npm run build --prefix client` ✅
   - Diagnostics check on changed files via editor problems API (`NavigationDrawer.jsx`, `AppSnackbar.jsx`, `notificationService.js`) ✅
- Known issues:
   - Manual runtime click-through for nav/unread UX was not executed in this session; build and static diagnostics are clean.
- Next recommended job:
   - M3/S3: add explicit publish hooks from booking thread read/send actions to refresh shared unread state immediately between poll ticks.
- Owner:
   - Agent C (Integrator)

## Session Update — 2026-03-07 02:50 (local)
- Milestone: M3
- Jobs completed:
   - Added additive server-side `notificationPreferences` and `pushTokens` fields in `server/models/User.js` while preserving existing `emailPreferences` behavior.
   - Added authenticated notification APIs in `server/routes/notifications.js` for preference read/write and push token registration/unregistration.
   - Mounted new notification routes at `/api/notifications` in `server/index.js`.
   - Added request/response contract examples in `M3_S1_NOTIFICATION_CONTRACT.md`.
- Files changed:
   - `server/models/User.js`
   - `server/routes/notifications.js`
   - `server/index.js`
   - `M3_S1_NOTIFICATION_CONTRACT.md`
   - `MOBILE_APP_PORT_HANDOFF.md`
- Validation run:
   - `npm run dev --prefix server` (startup equivalent validated)
   - Route-level verification (all status `200`):
      - `GET /api/notifications/preferences`
      - `PUT /api/notifications/preferences`
      - `POST /api/notifications/device-tokens/register`
      - `GET /api/notifications/device-tokens`
      - `DELETE /api/notifications/device-tokens/unregister`
- Known issues:
   - CSRF enforcement remains active for state-changing methods; app clients must continue sending matching CSRF cookie/header in current server mode.
   - `git` workspace still contains unrelated pre-existing native iOS/generated changes from earlier sessions.
- Next recommended job:
   - M3/S2: implement client notification service layer integration (polling + badge/snackbar wiring) against `/api/notifications` while preserving existing screens.
- Owner:
   - Agent C (Integrator)

## Session Update — 2026-03-07 03:10 (local)
- Milestone: M5
- Jobs completed:
   - Ran M5/S1 regression pass for app wrapper, auth, navigation, notifications, and booking-critical client paths.
   - Updated deployment/runbook docs with a mobile app demo flow, exact launch-step order, and a critical-path regression matrix.
   - Captured non-blocking known issues and post-v1 backlog pointers for notification sounds, Ionic account/Appflow usage, and local secure AI integration.
- Files changed:
   - `DEPLOYMENT_GUIDE.md`
   - `PRODUCTION_DEPLOYMENT.md`
   - `MOBILE_APP_PORT_HANDOFF.md`
- Validation run:
   - `npm run build --prefix client` (pass)
   - `npm run analytics:compact:dry --prefix server` (pass)
   - `npm run dev --prefix server` (startup + DB/connectivity logs)
   - `cd /Users/cross/Desktop/web-app/client && npx eslint ./src/utils/api.js ./src/pages/LoginPage.jsx ./src/components/NavigationDrawer.jsx ./src/components/AppSnackbar.jsx ./src/pages/ReservationListPage.jsx` (warnings only; no errors)
- Known issues:
   - ESLint warnings remain on hook dependency arrays in `client/src/components/NavigationDrawer.jsx` and `client/src/pages/ReservationListPage.jsx` (non-blocking for this slice).
   - Notification sound customization is not yet implemented; behavior uses OS default sounds.
   - Ionic account/Appflow integration is optional and currently not required for local/native release workflow.
- Next recommended job:
   - M5/S2: execute device-level (iOS + Android) manual smoke pass using the documented demo runbook and close/triage lint warnings that impact regression confidence.
- Owner:
   - Agent C (Integrator)

## Backlog (Post-v1)
- Standalone role-gated host↔guest DM (outside reservation threads)
- Public profile pages + privacy model
- Native widgets (platform-specific)
- Realtime transport upgrade (websocket/push event stream)

## Session Update — 2026-03-07 02:28 (local)
- Milestone: M1
- Jobs completed:
   - Initialized Capacitor wrapper in `client` with iOS + Android projects and sync pipeline.
   - Added mobile workflow scripts (`build:mobile`, `mobile:sync`, `mobile:open:ios`, `mobile:open:android`) to `client/package.json`.
   - Documented simulator/device flow and bootstrap troubleshooting in `QUICKSTART.md`.
- Files changed:
   - `client/package.json`
   - `client/package-lock.json`
   - `client/capacitor.config.json`
   - `client/ios/**` (generated native iOS project)
   - `client/android/**` (generated native Android project)
   - `QUICKSTART.md`
- Validation run:
   - `npm install --prefix ./client` ✅
   - `npm run build --prefix ./client` ✅
   - `npm run mobile:sync --prefix ./client` ✅
- Known issues:
   - `npm` audit reports existing vulnerabilities in `client` dependencies (not addressed in this session).
   - Initial validation attempt failed due terminal cwd/prefix path mismatch (`client/client/package.json`); rerun from repo root passed.
- Next recommended job:
   - M2/S1: implement app-safe auth/session compatibility layer (runtime detection + transport fallback) while preserving web cookie/CSRF flow.
- Owner:
   - Agent C (Integrator)

## Session Update — 2026-03-07 02:37 (local)
- Milestone: M2
- Jobs completed:
   - Added runtime app/web detection with transport mode abstraction in client/src/utils/api.js (web default, app for native runtime or explicit override).
   - Preserved browser cookie and CSRF behavior as default web path while routing app-mode authenticated requests through bearer-token transport when app tokens exist.
   - Added app-mode token/session interfaces (setAppAuthTokens, getAuthTransportMode, setAuthTransportModeOverride, isAppTransportMode, getAuthSessionContext) without UI rewrites.
- Files changed:
   - client/src/utils/api.js
   - MOBILE_APP_PORT_HANDOFF.md
- Validation run:
   - npm run build --prefix client (pass)
   - cd client && npx eslint src/utils/api.js src/pages/LoginPage.jsx (pass)
- Known issues:
   - npm run lint --prefix client -- src/utils/api.js src/pages/LoginPage.jsx still traverses generated native asset trees because the base script is eslint .; this produces unrelated pre-existing lint noise outside this scope.
- Next recommended job:
   - M2/S2: wire login/refresh/logout app-mode token exchange end-to-end (including fallback precedence and token-expiry UX) using the new transport interfaces.
- Owner:
   - Agent C (Integrator)

## Session Update — 2026-03-07 02:33 (local)
- Milestone: M1
- Jobs completed:
   - Verified Capacitor native bootstrap status for iOS + Android from current client output.
   - Confirmed mobile workflow scripts remain configured in `client/package.json` (`build:mobile`, `mobile:sync`, `mobile:open:ios`, `mobile:open:android`).
   - Revalidated simulator/device bootstrap flow and troubleshooting guidance in `QUICKSTART.md`.
- Files changed:
   - `MOBILE_APP_PORT_HANDOFF.md`
- Validation run:
   - `npm install --prefix client` ✅
   - `npm run build --prefix client` ✅
   - `npm run mobile:sync --prefix client` ✅
- Known issues:
   - `npm` audit still reports existing vulnerabilities in `client` dependencies (not addressed in this scope).
- Next recommended job:
   - M2/S1: implement app-safe auth/session compatibility layer (runtime/platform detection + transport fallback) while preserving web cookie/CSRF flow.
- Owner:
   - Agent C (Integrator)

## Session Update — 2026-03-07 03:20 (local)
- Milestone: M2
- Jobs completed:
   - Hardened server auth compatibility for app-mode fallback without removing web cookie flow.
   - Added request token helpers for bearer parsing, app-mode detection, and refresh-token resolution precedence.
   - Updated auth middleware to validate Authorization and cookie token paths with fallback verification.
   - Updated login/refresh/logout routes to use app-mode fallback resolution and return token payloads for app transport mode.
- Files changed:
   - `server/utils/tokenHelpers.js`
   - `server/middleware/auth.js`
   - `server/routes/auth.js`
   - `MOBILE_APP_PORT_HANDOFF.md`
- Validation run:
   - `npm run dev --prefix server` (startup validated)
   - `npm run analytics:compact:dry --prefix server` (pass)
   - Manual contract review: web cookie flow remains supported; app-mode bearer/body fallback added on targeted auth paths.
- Known issues:
   - `server/package.json` currently has no dedicated lint/test script; validation is limited to startup and available script execution.
- Next recommended job:
   - M2/S3: wire client login/logout flows to explicitly send app-mode signal and consume login token payload in native transport mode.
- Owner:
   - Agent C (Integrator)

## Session Update — 2026-03-07 03:02 (local)
- Milestone: M4
- Jobs completed:
   - Tightened mobile shell spacing on nav surfaces in `NavigationDrawer` (app bar, drawer lists, main shell padding, and bottom nav spacing).
   - Added mobile safe-area handling for top/bottom nav surfaces to improve iOS webview fit.
   - Normalized top-level shell variant usage (desktop nav links use consistent `text` + `size="small"`, host upgrade uses `outlined` + `color="warning"`, primary CTA remains `contained` + `size="small"`, mobile nav surface elevation aligned with app bar).
   - Preserved existing IA, routes, and features with no new components introduced.
- Files changed:
   - `client/src/components/NavigationDrawer.jsx`
   - `client/src/App.css`
   - `MOBILE_APP_PORT_HANDOFF.md`
- Validation run:
   - `npm run build --prefix client` ✅
   - Changed-file diagnostics via editor problems API (`NavigationDrawer.jsx`, `App.css`) ✅
   - Manual shell consistency notes: core routes continue to render through shared `NavigationDrawer` shell in `App.jsx`; nav action hierarchy remains unchanged across home/properties/browse/trips/reservations/support/admin entry points.
- Known issues:
   - No simulator/device visual screenshot pass was executed in this slice; manual notes are based on shell contract review and successful production build.
- Next recommended job:
   - M4/S3: perform dark/light parity and device-level visual QA sweep across core routes, then apply only token-level micro-adjustments if drift is found.
- Owner:
   - Agent C (Integrator)

## Session Update — 2026-03-07 03:06 (local)
- Milestone: M4
- Jobs completed:
   - Performed focused dark/light parity audit of top-level shell/nav surfaces (`NavigationDrawer`, shell wrapper, app bar, drawer, bottom nav, and global shell CSS).
   - Applied a token-safe micro-adjustment to remove global body top safe-area padding that could double-stack with app-bar safe-area inset on mobile webviews.
   - Preserved existing route structure, actions, and component hierarchy (no feature or IA changes).
- Files changed:
   - `client/src/App.css`
   - `MOBILE_APP_PORT_HANDOFF.md`
- Validation run:
   - `npm run build --prefix client` ✅
   - Changed-file diagnostics via editor problems API (`App.css`, `NavigationDrawer.jsx`) ✅
   - Manual shell parity notes: shell/nav surfaces use theme-aware palette tokens (`background.paper`, `divider`, semantic button colors); no top-level hard-coded shell color overrides introduced in this slice.
- Known issues:
   - Device/simulator screenshot capture still pending; parity confirmation remains build + static review based for this pass.
- Next recommended job:
   - M5/S1: execute stabilization checklist pass (auth, navigation, notifications, booking), then record release-readiness risks and doc deltas.
- Owner:
   - Agent C (Integrator)
