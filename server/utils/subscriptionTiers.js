/**
 * Subscription Tier Configuration & Utilities
 * Manages tier limits and price-to-tier mapping
 */

const TIER_LIMITS = {
  0: { name: "Free", listings: 0 },
  1: { name: "Basic", listings: 2, price: 5 },
  2: { name: "Growth", listings: 5, price: 15 },
  3: { name: "Professional", listings: 10, price: 30 },
  4: { name: "Enterprise", listings: 25, price: 75 }
};

/**
 * Map Stripe price ID to tier number
 * @param {string} priceId - Stripe price ID
 * @returns {number} Tier number (0-4), or 0 if unknown
 */
const getTierFromPrice = (priceId) => {
  const tierMap = {
    [process.env.STRIPE_PRICE_TIER1]: 1,
    [process.env.STRIPE_PRICE_TIER2]: 2,
    [process.env.STRIPE_PRICE_TIER3]: 3,
    [process.env.STRIPE_PRICE_TIER4]: 4,
  };
  return tierMap[priceId] || 0;
};

/**
 * Get listing limit for a tier
 * @param {number} tier - Tier number (0-4)
 * @returns {number} Maximum number of active listings
 */
const getListingLimit = (tier) => {
  return TIER_LIMITS[tier]?.listings || 0;
};

/**
 * Get tier info by number
 * @param {number} tier - Tier number
 * @returns {object} Tier info (name, listings, price)
 */
const getTierInfo = (tier) => {
  return TIER_LIMITS[tier] || TIER_LIMITS[0];
};

module.exports = {
  TIER_LIMITS,
  getTierFromPrice,
  getListingLimit,
  getTierInfo
};
