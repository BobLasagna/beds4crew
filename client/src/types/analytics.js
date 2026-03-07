/**
 * @typedef {Object} AnalyticsEvent
 * @property {string} [_id]
 * @property {string | Date} occurredAt
 * @property {string | Date} bucketStart
 * @property {number} [occurrences]
 * @property {number} [totalDurationMs]
 * @property {number} [durationMs]
 * @property {string} [visitorId]
 * @property {string} [userId]
 * @property {string} [method]
 * @property {string} [path]
 * @property {string} [routeGroup]
 * @property {number} [statusCode]
 * @property {string} [deviceType]
 * @property {string} [osName]
 * @property {string} [browserName]
 * @property {string} [referrer]
 * @property {Record<string, any>} [bodyMeta]
 */

/**
 * @typedef {Object} AnalyticsFilters
 * @property {number} [days]
 * @property {string} [route]
 * @property {string} [statusCategory]
 * @property {string} [deviceType]
 */

export const STATUS_CATEGORIES = ['all', '2xx', '3xx', '4xx', '5xx'];

export const toStatusCategory = (statusCode) => {
  const code = Number(statusCode);
  if (code >= 200 && code < 300) return '2xx';
  if (code >= 300 && code < 400) return '3xx';
  if (code >= 400 && code < 500) return '4xx';
  if (code >= 500 && code < 600) return '5xx';
  return 'other';
};

export const ANALYTICS_ALL_OPTION = 'all';
