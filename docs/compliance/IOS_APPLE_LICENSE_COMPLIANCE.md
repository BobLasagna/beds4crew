# iOS Apple Program Agreement Compliance Notes

Scope: iOS app wrapper behavior and review/docs alignment against `Apple_Developer_Program_License_Agreement_CQ4PWZ329Z.pdf` (developer agreement text extracted locally).

## Clause-to-Implementation Mapping

- **3.3.3 (Data and Privacy)**
  - Requirement: clear disclosures, consent-respecting behavior, and privacy policy availability.
  - Implemented:
    - Privacy/terms resources exposed through in-app support routes (`/privacy`, `/terms`).
    - Consent controls for analytics surfaced in-app.
    - iOS permission purpose strings added in `client/ios/App/App/Info.plist` for camera/photo usage.

- **3.3.3(F)(ii)/(iv) (Location/data consent and system prompts)**
  - Requirement: do not bypass Apple consent prompts; purpose strings must be accurate.
  - Implemented:
    - Location selection is manual map interaction (no forced GPS request flow in iOS wrapper code).
    - Camera/photo purpose strings are explicit and limited to user-initiated uploads.

- **3.3.2(C) and 3.3.9(A) references (additional features/payment unlocking constraints)**
  - Risk area: enabling or unlocking paid functionality through non-Apple mechanisms in iOS app context.
  - Implemented mitigation (iOS-only):
    - Disabled launching external Stripe checkout from `PricingPage` when running in native iOS runtime.
    - Disabled launching Stripe billing portal from `ProfilePage` when running in native iOS runtime.
    - Review docs updated to state no in-app external payment flow is initiated in the iOS build.

- **Security baseline (program requirements + platform expectations)**
  - Improvement made:
    - Removed `NSAllowsArbitraryLoadsInWebContent` from iOS ATS settings in `Info.plist`.

## Files Updated for Compliance Pass

- `client/ios/App/App/Info.plist`
- `client/src/pages/PricingPage.jsx`
- `client/src/pages/ProfilePage.jsx`
- `APP_REVIEW_ATTACHMENT.md`
- `APP_REVIEW_ATTACHMENT.rtf`

## Remaining Manual/Legal Review Items

- Confirm business/payment model classification for host subscriptions in iOS against current App Store policy and your specific agreement attachments (this pass implements technical risk reduction, not legal advice).
- Ensure App Store Connect privacy nutrition labels match actual collected data and SDK behavior.
- Verify final App Store metadata links to the same privacy policy/terms content exposed in-app.
