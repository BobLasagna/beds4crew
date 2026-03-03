import supportChatFlows from "../data/supportChatFlows.json";

/**
 * Check if a given slug has a configured chat flow.
 * @param {string} slug - The topic slug to check
 * @returns {boolean} True if the slug exists in supportChatFlows
 */
export const hasChatFlow = (slug) => {
  if (!slug) {
    return false;
  }

  return Object.prototype.hasOwnProperty.call(supportChatFlows, slug)
    || Object.prototype.hasOwnProperty.call(supportChatFlows, "default");
};

/**
 * Get all available chat flow slugs.
 * @returns {Array<string>} Array of configured slug keys
 */
export const getChatFlowSlugs = () => {
  return Object.keys(supportChatFlows).filter((key) => key !== "default");
};
