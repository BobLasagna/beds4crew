const { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME, CSRF_COOKIE_NAME } = require("./tokenHelpers");

const envBoolean = (name, defaultValue) => {
  const value = process.env[name];
  if (value === undefined || value === null || value === "") return defaultValue;
  return String(value).toLowerCase() === "true";
};

const getAnalyticsConfig = () => {
  const analyticsEnabled = envBoolean("ANALYTICS_ENABLED", true);

  return {
    analyticsEnabled,
    cookieName: process.env.ANALYTICS_COOKIE_NAME || "b4c_vid",
    consentCookieName: process.env.ANALYTICS_CONSENT_COOKIE_NAME || "analytics_consent",
    cookieDays: Math.max(parseInt(process.env.ANALYTICS_COOKIE_DAYS || "365", 10) || 365, 1),
    trackPathPrefix: process.env.ANALYTICS_TRACK_PATH_PREFIX || "/api",
    hashSalt: process.env.ANALYTICS_HASH_SALT || "beds4crew-default-analytics-salt",
    storeRawIp: envBoolean("ANALYTICS_STORE_RAW_IP", false),
    captureBrowser: envBoolean("ANALYTICS_CAPTURE_BROWSER", true),
    captureUserAgent: envBoolean("ANALYTICS_CAPTURE_USER_AGENT", true),
    captureLanguage: envBoolean("ANALYTICS_CAPTURE_LANGUAGE", true),
    captureTimezone: envBoolean("ANALYTICS_CAPTURE_TIMEZONE", true),
    captureLocation: envBoolean("ANALYTICS_CAPTURE_LOCATION", true),
    captureIsp: envBoolean("ANALYTICS_CAPTURE_ISP", true),
    captureIpHash: envBoolean("ANALYTICS_CAPTURE_IP_HASH", true),
    requireVoluntaryForAdvanced: envBoolean("ANALYTICS_REQUIRE_VOLUNTARY_FOR_ADVANCED", true),
    dedupeWindowSeconds: Math.max(parseInt(process.env.ANALYTICS_DEDUPE_WINDOW_SECONDS || "60", 10) || 60, 5),
    flushIntervalMs: Math.max(parseInt(process.env.ANALYTICS_FLUSH_INTERVAL_MS || "15000", 10) || 15000, 1000),
    maxBufferedKeys: Math.max(parseInt(process.env.ANALYTICS_MAX_BUFFERED_KEYS || "2000", 10) || 2000, 100),
    trackMethods: (process.env.ANALYTICS_TRACK_METHODS || "GET,POST,PUT,PATCH,DELETE")
      .split(",")
      .map((value) => value.trim().toUpperCase())
      .filter(Boolean),
    ignorePaths: (process.env.ANALYTICS_IGNORE_PATHS || "/api/health,/api/auth/csrf,/api/auth/refresh")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    authUseHttpOnlyCookies: envBoolean("AUTH_USE_HTTP_ONLY_COOKIES", true),
    authRequireCsrf: envBoolean("AUTH_REQUIRE_CSRF", true),
  };
};

const getPolicyCookieCatalog = () => {
  const config = getAnalyticsConfig();

  const cookies = [
    {
      name: ACCESS_COOKIE_NAME,
      category: "essential",
      required: true,
      active: config.authUseHttpOnlyCookies,
      httpOnly: true,
      retention: "15 minutes",
      purpose: "Keeps your signed-in session active while you use protected routes.",
    },
    {
      name: REFRESH_COOKIE_NAME,
      category: "essential",
      required: true,
      active: config.authUseHttpOnlyCookies,
      httpOnly: true,
      retention: "7 days",
      purpose: "Refreshes your access session without forcing frequent logins.",
    },
    {
      name: CSRF_COOKIE_NAME,
      category: "essential",
      required: config.authRequireCsrf,
      active: config.authRequireCsrf,
      httpOnly: false,
      retention: "7 days",
      purpose: "Pairs with a header token to block forged account actions.",
    },
    {
      name: config.cookieName,
      category: "analytics",
      required: false,
      active: config.analyticsEnabled,
      httpOnly: true,
      retention: `${config.cookieDays} days`,
      purpose: "Stores an anonymous analytics visitor ID for trend analysis.",
    },
    {
      name: config.consentCookieName,
      category: "preferences",
      required: false,
      active: config.analyticsEnabled,
      httpOnly: false,
      retention: `${config.cookieDays} days`,
      purpose: "Remembers your analytics consent choice by region-aware rules.",
    },
    {
      name: "analytics_opt_out",
      category: "preferences",
      required: false,
      active: config.analyticsEnabled,
      httpOnly: true,
      retention: `${config.cookieDays} days`,
      purpose: "Hard-stops analytics tracking after you decline optional analytics.",
    },
    {
      name: process.env.ANALYTICS_VOLUNTARY_COOKIE_NAME || "analytics_voluntary",
      category: "preferences",
      required: false,
      active: config.analyticsEnabled,
      httpOnly: false,
      retention: `${config.cookieDays} days`,
      purpose: "Stores your separate opt-in for advanced optional diagnostics signals.",
    },
    {
      name: "reservationChatShowPending",
      category: "preferences",
      required: false,
      active: true,
      httpOnly: false,
      retention: "365 days",
      purpose: "Keeps your reservation inbox pending filter preference.",
    },
    {
      name: "reservationChatShowConfirmed",
      category: "preferences",
      required: false,
      active: true,
      httpOnly: false,
      retention: "365 days",
      purpose: "Keeps your reservation inbox confirmed filter preference.",
    },
    {
      name: "reservationChatShowArchived",
      category: "preferences",
      required: false,
      active: true,
      httpOnly: false,
      retention: "365 days",
      purpose: "Keeps your reservation inbox archived filter preference.",
    },
  ];

  return { config, cookies };
};

module.exports = {
  envBoolean,
  getAnalyticsConfig,
  getPolicyCookieCatalog,
};
