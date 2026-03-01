const express = require("express");
const verifyToken = require("../middleware/auth");
const User = require("../models/User");
const { getTierFromPrice, getListingLimit, getTierInfo } = require("../utils/subscriptionTiers");

const router = express.Router();

const getStripe = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return require("stripe")(secretKey);
};

const getBaseUrl = (req) => {
  if (process.env.CLIENT_URL) return process.env.CLIENT_URL;

  const origin = req.headers.origin;
  if (origin) return origin;

  const referer = req.headers.referer;
  if (referer) {
    try {
      return new URL(referer).origin;
    } catch (error) {
      // ignore
    }
  }

  return `${req.protocol}://${req.get("host")}`;
};

const upsertSubscriptionDetails = async ({
  userId,
  stripeCustomerId,
  stripeSubscriptionId,
  status,
  currentPeriodEnd,
  priceId, // NEW: track price ID for tier mapping
}) => {
  // NEW: Calculate tier from price ID
  const tier = getTierFromPrice(priceId);
  const listingLimit = getListingLimit(tier);

  const update = {
    stripeCustomerId,
    stripeSubscriptionId,
    subscriptionStatus: status || null,
    subscriptionCurrentPeriodEnd: currentPeriodEnd || null,
    hasPaid: ["active", "trialing"].includes(status),
    stripeCurrentTier: tier, // NEW
    listingLimit: listingLimit, // NEW
  };

  // If subscription is active or trialing, set user role to host
  if (["active", "trialing"].includes(status)) {
    update.role = "host";
  }
  // If subscription is canceled, incomplete, past_due, or unpaid, revert to guest
  else if (["canceled", "incomplete", "incomplete_expired", "past_due", "unpaid"].includes(status)) {
    update.role = "guest";
    update.hasPaid = false;
    update.stripeCurrentTier = 0; // NEW: Reset tier
    update.listingLimit = 0; // NEW: Reset limit
  }

  await User.findByIdAndUpdate(userId, update, { new: true });
};

// NEW: Get user's tier info
router.get("/user-tier", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "stripeCurrentTier listingLimit role"
    );
    if (!user) return res.status(404).json({ message: "User not found" });

    // Count active properties
    const Property = require("../models/Property");
    const activeListings = await Property.countDocuments({
      ownerHost: user._id,
      status: "active"
    });

    const tierInfo = getTierInfo(user.stripeCurrentTier);

    return res.json({
      tier: user.stripeCurrentTier,
      tierName: tierInfo.name,
      listingLimit: user.listingLimit,
      activeListings: activeListings,
      canAddMore: activeListings < user.listingLimit
    });
  } catch (error) {
    console.error("Tier info error:", error.message);
    return res.status(500).json({ message: "Failed to fetch tier info" });
  }
});

// UPDATED: Checkout with tier selection
router.post("/checkout-tier", verifyToken, async (req, res) => {
  try {
    const { tier } = req.body;

    if (![1, 2, 3, 4].includes(tier)) {
      return res.status(400).json({ message: "Invalid tier" });
    }

    const tierPriceMap = {
      1: process.env.STRIPE_PRICE_TIER1,
      2: process.env.STRIPE_PRICE_TIER2,
      3: process.env.STRIPE_PRICE_TIER3,
      4: process.env.STRIPE_PRICE_TIER4,
    };

    const priceId = tierPriceMap[tier];

    if (!priceId) {
      return res.status(500).json({ message: "Price not configured" });
    }

    const stripe = getStripe();
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    let customerId = user.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`.trim(),
        metadata: { userId: user._id.toString() },
      });
      customerId = customer.id;
      user.stripeCustomerId = customerId;
      await user.save();
    }

    const baseUrl = getBaseUrl(req);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/profile?checkout=success`,
      cancel_url: `${baseUrl}/pricing`,
      allow_promotion_codes: true,
      client_reference_id: user._id.toString(),
      subscription_data: {
        metadata: { userId: user._id.toString(), tier: tier.toString() },
      },
    });

    return res.json({ url: session.url });
  } catch (error) {
    console.error("Tier checkout error:", error.message);
    return res.status(500).json({
      message: process.env.NODE_ENV === 'production'
        ? "Failed to create checkout session"
        : `Failed to create checkout session: ${error.message}`
    });
  }
});

// LEGACY: Keep for backward compatibility
router.post("/create-checkout-session", verifyToken, async (req, res) => {
  try {
    if (!process.env.STRIPE_PRICE_ID) {
      return res.status(500).json({ message: "STRIPE_PRICE_ID is not configured" });
    }

    const stripe = getStripe();
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Check if user already has an active subscription
    if (user.stripeSubscriptionId && ["active", "trialing"].includes(user.subscriptionStatus)) {
      return res.status(400).json({ 
        message: "You already have an active subscription",
        hasActiveSubscription: true 
      });
    }

    let customerId = user.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`.trim(),
        metadata: { userId: user._id.toString() },
      });
      customerId = customer.id;
      user.stripeCustomerId = customerId;
      await user.save();
    }

    const baseUrl = getBaseUrl(req);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `${baseUrl}/profile?checkout=success`,
      cancel_url: `${baseUrl}/profile?checkout=cancel`,
      allow_promotion_codes: true,
      client_reference_id: user._id.toString(),
      subscription_data: {
        metadata: { userId: user._id.toString() },
      },
    });

    return res.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error.message);
    return res.status(500).json({ 
      message: process.env.NODE_ENV === 'production' 
        ? "Failed to create checkout session" 
        : `Failed to create checkout session: ${error.message}`
    });
  }
});

router.post("/create-portal-session", verifyToken, async (req, res) => {
  try {
    const stripe = getStripe();
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.stripeCustomerId) {
      return res.status(400).json({ message: "No Stripe customer found" });
    }

    const baseUrl = getBaseUrl(req);
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${baseUrl}/profile`,
    });

    return res.json({ url: portalSession.url });
  } catch (error) {
    console.error("Stripe portal error:", error.message);
    return res.status(500).json({ 
      message: process.env.NODE_ENV === 'production'
        ? "Failed to create portal session"
        : `Failed to create portal session: ${error.message}`
    });
  }
});

// Manual sync endpoint - fetch subscription data directly from Stripe
router.post("/sync-subscription", verifyToken, async (req, res) => {
  try {
    const stripe = getStripe();
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.stripeCustomerId) {
      return res.status(400).json({ 
        message: "No Stripe customer found. Please subscribe first.",
        synced: false
      });
    }

    // Fetch all subscriptions for this customer from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      limit: 10,
    });

    if (subscriptions.data.length === 0) {
      // Clear subscription data if none exists in Stripe
      await User.findByIdAndUpdate(user._id, {
        stripeSubscriptionId: "",
        subscriptionStatus: "",
        subscriptionCurrentPeriodEnd: null,
        hasPaid: false,
        role: "guest",
        stripeCurrentTier: 0,
        listingLimit: 0
      });
      console.log(`[Stripe] Sync: No subscriptions found for user ${user._id}`);
      return res.json({ 
        message: "No active subscription found in Stripe. User data cleared.",
        synced: true,
        subscription: null
      });
    }

    // Get the most recent subscription
    const subscription = subscriptions.data[0];
    const currentPeriodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000)
      : null;

    // Extract price ID from subscription
    const priceId = subscription.items?.data?.[0]?.price?.id;

    // Update user with Stripe data
    await upsertSubscriptionDetails({
      userId: user._id,
      stripeCustomerId: user.stripeCustomerId,
      stripeSubscriptionId: subscription.id,
      status: subscription.status,
      currentPeriodEnd,
      priceId, // NEW
    });

    // Fetch updated user
    const updatedUser = await User.findById(user._id).select("-password").lean();

    console.log(`[Stripe] Manual sync completed for user: ${user._id}, status: ${subscription.status}`);

    return res.json({
      message: "Subscription synced successfully",
      synced: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        currentPeriodEnd,
        role: updatedUser.role,
        hasPaid: updatedUser.hasPaid,
        tier: updatedUser.stripeCurrentTier,
        listingLimit: updatedUser.listingLimit
      }
    });
  } catch (error) {
    console.error("[Stripe] Sync error:", error.message, error.param);
    return res.status(500).json({ 
      message: error.param == "customer" ? "Failed to find customer in Stripe" : "Failed to sync subscription",
      error: process.env.NODE_ENV === 'production' ? undefined : error.message,
      synced: false
    });
  }
});

const handleWebhook = async (req, res) => {
  let event;
  try {
    const stripe = getStripe();
    const signature = req.headers["stripe-signature"];

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error("[Stripe] Webhook secret not configured");
      return res.status(500).json({ message: "STRIPE_WEBHOOK_SECRET is not configured" });
    }

    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    const isDev = process.env.NODE_ENV !== 'production';
    if (isDev) console.log(`[Stripe] Webhook received: ${event.type}`);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode !== "subscription") break;

        const stripeSubscriptionId = session.subscription;
        const stripeCustomerId = session.customer;
        const userId = session.client_reference_id || session.metadata?.userId;
        
        const stripeApi = getStripe();
        const subscription = await stripeApi.subscriptions.retrieve(stripeSubscriptionId);

        const currentPeriodEnd = subscription?.current_period_end
          ? new Date(subscription.current_period_end * 1000)
          : null;

        // NEW: Extract price ID
        const priceId = subscription.items?.data?.[0]?.price?.id;

        if (userId) {
          await upsertSubscriptionDetails({
            userId,
            stripeCustomerId,
            stripeSubscriptionId,
            status: subscription.status,
            currentPeriodEnd,
            priceId, // NEW
          });
          console.log(`[Stripe] Subscription activated for user: ${userId}`);
        } else if (stripeCustomerId) {
          const user = await User.findOne({ stripeCustomerId });
          if (user) {
            await upsertSubscriptionDetails({
              userId: user._id,
              stripeCustomerId,
              stripeSubscriptionId,
              status: subscription.status,
              currentPeriodEnd,
              priceId, // NEW
            });
            console.log(`[Stripe] Subscription activated for customer: ${stripeCustomerId}`);
          } else {
            console.error(`[Stripe] ERROR: No user found for customer: ${stripeCustomerId}`);
          }
        } else {
          console.error(`[Stripe] ERROR: No userId or customerId in checkout session`);
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const stripeCustomerId = subscription.customer;
        const stripeSubscriptionId = subscription.id;
        const currentPeriodEnd = subscription?.current_period_end
          ? new Date(subscription.current_period_end * 1000)
          : null;

        // NEW: Extract price ID
        const priceId = subscription.items?.data?.[0]?.price?.id;

        const user = await User.findOne({
          $or: [
            { stripeCustomerId },
            { stripeSubscriptionId },
          ],
        });

        if (user) {
          await upsertSubscriptionDetails({
            userId: user._id,
            stripeCustomerId,
            stripeSubscriptionId,
            status: subscription.status,
            currentPeriodEnd,
            priceId, // NEW
          });
          console.log(`[Stripe] Subscription ${event.type === 'customer.subscription.deleted' ? 'deleted' : 'updated'} for user: ${user._id}`);
        } else {
          console.error(`[Stripe] ERROR: No user found for subscription: ${stripeSubscriptionId}`);
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const stripeCustomerId = invoice.customer;
        const user = await User.findOne({ stripeCustomerId });
        if (user) {
          user.subscriptionStatus = "past_due";
          user.hasPaid = false;
          user.role = "guest";
          user.stripeCurrentTier = 0; // NEW: Reset tier
          user.listingLimit = 0; // NEW: Reset limit
          await user.save();
          console.warn(`[Stripe] Payment failed for user: ${user._id}, reverted to guest`);
        } else {
          console.error(`[Stripe] ERROR: No user found for customer: ${stripeCustomerId}`);
        }
        break;
      }
      default:
        break;
    }

    res.json({ received: true });
  } catch (error) {
    console.error("[Stripe] Webhook error:", error.message);
    if (process.env.NODE_ENV !== 'production') {
      console.error("Stack:", error.stack);
    }
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
};

module.exports = { router, handleWebhook };
