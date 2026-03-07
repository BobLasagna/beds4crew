# Production Deployment Checklist

## 📱 Mobile Launch Stabilization (M5/S1)

Use this section as the release-readiness gate for the app wrapper launch slice.

### Regression matrix (critical paths)

| Area | Scope | Result | Severity |
|------|-------|--------|----------|
| App wrapper | Client production build (`vite build`) | Pass | Low |
| Auth | Login/session transport surfaces linted (`LoginPage`, `api.js`) | Pass (warnings only) | Low |
| Navigation | `NavigationDrawer` linted and build-integrated | Pass (warnings only) | Low |
| Notifications | `AppSnackbar` linted and build-integrated | Pass | Low |
| Booking-critical | `ReservationListPage` linted and build-integrated | Pass (warnings only) | Low |
| Server runtime | `npm run dev --prefix server` startup + analytics dry-run | Pass | Low |

No high-severity regression identified in this M5/S1 pass.

### Required developer launch steps (exact order)

1. Build + verify client bundle:
  ```bash
  npm run build --prefix client
  ```
2. Validate server script health:
  ```bash
  npm run analytics:compact:dry --prefix server
  ```
3. Start server and verify boot logs:
  ```bash
  npm run dev --prefix server
  ```
4. Run focused critical-path lint checks:
  ```bash
  cd /Users/cross/Desktop/web-app/client && npx eslint ./src/utils/api.js ./src/pages/LoginPage.jsx ./src/components/NavigationDrawer.jsx ./src/components/AppSnackbar.jsx ./src/pages/ReservationListPage.jsx
  ```
5. Run the demo helper (session prompt generation):
  ```bash
  ./mobile-one-click.sh --status
  ./mobile-one-click.sh
  ```

### Known issues (non-blocking for v1)

- ESLint reports hook dependency warnings (no errors) on:
  - `src/components/NavigationDrawer.jsx`
  - `src/pages/ReservationListPage.jsx`
- Notification settings currently rely on OS default sound; in-app sound picker is not implemented.
- Ionic account/Appflow setup is optional and only needed for cloud packaging workflows.

### Post-v1 backlog pointers

- Add user-selectable notification sound profiles in app settings.
- Add optional Ionic Appflow-based CI packaging lane (iOS/Android artifacts).
- Integrate local secure AI assistant workflow (on-device or self-hosted service) with explicit privacy constraints.

## ✅ Environment Variables

Ensure these are set in your production environment:

### Required
- [ ] `MONGO_URL` - MongoDB connection string
- [ ] `JWT_SECRET` - Strong random string for access tokens
- [ ] `JWT_REFRESH_SECRET` - Strong random string for refresh tokens
- [ ] `AUTH_USE_HTTP_ONLY_COOKIES=true` - Enables cookie session mode
- [ ] `AUTH_REQUIRE_CSRF=true` - Enforces CSRF on state-changing routes
- [ ] `ADMIN_ALLOWLIST_EMAILS` - Comma-separated admin emails
- [ ] `ADMIN_ALLOWLIST_IDS` - Comma-separated admin user IDs (optional)
- [ ] `STRIPE_SECRET_KEY` - Stripe production secret key (starts with `sk_live_`)
- [ ] `STRIPE_PRICE_TIER1` - Stripe Basic plan price ID (starts with `price_`)
- [ ] `STRIPE_PRICE_TIER2` - Stripe Growth plan price ID (starts with `price_`)
- [ ] `STRIPE_PRICE_TIER3` - Stripe Professional plan price ID (starts with `price_`)
- [ ] `STRIPE_PRICE_TIER4` - Stripe Enterprise plan price ID (starts with `price_`)
- [ ] `STRIPE_WEBHOOK_SECRET` - Stripe production webhook secret (starts with `whsec_`)
- [ ] `CLIENT_URL` - Your production domain (e.g., `https://yourdomain.com`)
- [ ] `NODE_ENV=production` - **CRITICAL** for security and performance

### Optional
- [ ] `SENDGRID_API_KEY` - For email notifications
- [ ] `EMAIL_FROM` - Sender email address
- [ ] `EMAIL_FROM_NAME` - Sender name
- [ ] `GEOCODING_API_KEY` - If using external geocoding service
- [ ] `PORT` - Server port (default: 3001)

## 🔐 Stripe Configuration

### 1. Switch to Production Mode
- [ ] Log into Stripe Dashboard
- [ ] Toggle from "Test mode" to "Production mode" (top right)

### 2. Get Production Keys
- [ ] Go to Developers → API keys
- [ ] Copy "Secret key" (starts with `sk_live_`)
- [ ] Add to environment: `STRIPE_SECRET_KEY=sk_live_...`

### 3. Create Production Tier Prices
- [ ] Go to Products → Add product (one product/price per tier)
- [ ] Create prices for Basic, Growth, Professional, Enterprise
- [ ] Copy each Price ID (starts with `price_`)
- [ ] Add to environment:
  - `STRIPE_PRICE_TIER1=price_...`
  - `STRIPE_PRICE_TIER2=price_...`
  - `STRIPE_PRICE_TIER3=price_...`
  - `STRIPE_PRICE_TIER4=price_...`

### 4. Configure Webhooks
- [ ] Go to Developers → Webhooks
- [ ] Click "Add endpoint"
- [ ] Endpoint URL: `https://yourdomain.com/api/billing/webhook`
- [ ] Select events to listen to:
  - [x] `checkout.session.completed`
  - [x] `customer.subscription.updated`
  - [x] `customer.subscription.deleted`
  - [x] `invoice.payment_failed`
- [ ] Click "Add endpoint"
- [ ] Reveal and copy "Signing secret" (starts with `whsec_`)
- [ ] Add to environment: `STRIPE_WEBHOOK_SECRET=whsec_...`

## 🌐 Domain & SSL

- [ ] Custom domain configured
- [ ] SSL certificate installed (HTTPS required by Stripe)
- [ ] DNS records properly configured
- [ ] CORS configured for your domain

## 🗄️ Database

- [ ] MongoDB production cluster created
- [ ] Database user with appropriate permissions
- [ ] IP whitelist configured (if applicable)
- [ ] Backups enabled
- [ ] Connection string uses production credentials

## 🔒 Security Checklist

- [ ] `NODE_ENV=production` is set
- [ ] Strong JWT secrets (min 32 characters, random)
- [ ] Different secrets for development and production
- [ ] HTTPS enabled (required for Stripe)
- [ ] CORS restricted to your domain
- [ ] Rate limiting configured (if needed)
- [ ] No test data in production database
- [ ] Error messages don't expose sensitive info
- [ ] Development-only endpoints disabled (`/toggle-payment`)

## 📝 Testing Before Launch

### Test Subscription Flow
- [ ] Create test subscription with real card
- [ ] Verify webhook events received
- [ ] Check user role changed to "host"
- [ ] Verify all subscription fields populated:
  - `stripeCustomerId`
  - `stripeSubscriptionId`
  - `subscriptionStatus: "active"`
  - `subscriptionCurrentPeriodEnd`
  - `role: "host"`
  - `hasPaid: true`

### Test Subscription Management
- [ ] Open billing portal
- [ ] Update payment method
- [ ] Cancel subscription
- [ ] Verify webhook updates database
- [ ] Verify role reverts to "guest"

### Test Edge Cases
- [ ] Try to create duplicate subscription (should fail)
- [ ] Try to manually toggle role with active subscription (should fail)
- [ ] Test manual sync button
- [ ] Test payment failure scenario

## 🚀 Deployment Steps

1. **Build Frontend**
   ```bash
   cd client
   npm run build
   ```

2. **Deploy Backend**
   - Upload code to server
   - Install dependencies: `npm install --production`
   - Set all environment variables
   - Start with process manager (PM2, systemd, etc.)

3. **Verify Webhooks**
   - Go to Stripe Dashboard → Webhooks
   - Check "Recent deliveries"
   - Ensure webhooks are being received successfully

4. **Monitor Logs**
   - Watch for `[Stripe]` prefixed logs
   - Monitor for errors
   - Check webhook delivery status in Stripe

## 📊 Monitoring

### Key Logs to Monitor
```
[Stripe] Webhook received: checkout.session.completed
[Stripe] Subscription activated for user: <userId>
[Stripe] Subscription updated for user: <userId>
[Stripe] Payment failed for user: <userId>
```

### Error Logs to Watch
```
[Stripe] ERROR: No user found for customer: <customerId>
[Stripe] ERROR: No userId or customerId in checkout session
[Stripe] Webhook error: <error message>
```

## 🔄 Post-Deployment

- [ ] Test complete subscription flow with real payment
- [ ] Verify webhook events in Stripe dashboard
- [ ] Check database for correct data
- [ ] Test subscription cancellation
- [ ] Test manual sync feature
- [ ] Monitor logs for 24 hours
- [ ] Set up alerts for failed webhooks

## 🆘 Rollback Plan

If issues occur:
1. Disable strict auth rollout flags temporarily:
  - `AUTH_USE_HTTP_ONLY_COOKIES=false`
  - `AUTH_REQUIRE_CSRF=false`
2. Keep JWT secrets configured (`JWT_SECRET`, `JWT_REFRESH_SECRET`) during rollback
3. Switch Stripe back to test mode if billing behavior is impacted
4. Restore previous environment variables
5. Check webhook delivery logs in Stripe
6. Review server logs for errors
7. Use manual sync feature to fix inconsistent data

## 📱 User Communication

- [ ] Announce subscription feature
- [ ] Provide clear pricing information
- [ ] Link to billing portal for management
- [ ] Document subscription benefits
- [ ] Provide support contact for billing issues

## 🔧 Maintenance

### Regular Tasks
- Monitor failed webhook deliveries
- Check for inactive subscriptions
- Review subscription metrics
- Update Stripe keys if rotated
- Test webhook endpoint periodically

### If Webhooks Fail
1. Check Stripe webhook delivery logs
2. Verify endpoint is accessible
3. Check webhook secret is correct
4. Users can use "Sync Subscription" button as workaround
5. Fix issue and manually sync affected users

## 📞 Support Contacts

- **Stripe Support**: https://support.stripe.com
- **Webhook Issues**: Check Stripe Dashboard → Webhooks → Recent deliveries
- **Manual Sync**: Users can click "Sync Subscription" in Profile

## ✨ Production-Ready Features

- ✅ Automatic role management (guest ↔ host)
- ✅ Duplicate subscription prevention
- ✅ Manual sync with Stripe
- ✅ Proper webhook handling
- ✅ Development endpoints disabled in production
- ✅ Sanitized error messages
- ✅ Comprehensive logging
- ✅ Subscription status tracking
- ✅ Payment failure handling
- ✅ Billing portal integration

---

## Quick Verification Commands

### Check Environment Variables
```bash
echo $NODE_ENV                    # Should be "production"
echo $STRIPE_SECRET_KEY | head -c 8  # Should be "sk_live_"
echo $STRIPE_WEBHOOK_SECRET | head -c 6  # Should be "whsec_"
```

### Test Webhook Endpoint
```bash
curl -X POST https://yourdomain.com/api/billing/webhook
# Should return 400 with "Webhook Error" (no signature)
```

### Check User Subscription Status
```bash
curl -H "Authorization: Bearer <token>" \
  https://yourdomain.com/api/user/subscription-status
```

### Manual Sync
```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  https://yourdomain.com/api/billing/sync-subscription
```
