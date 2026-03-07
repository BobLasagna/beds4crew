const ANALYTICS_COOKIE_DAYS = Math.max(parseInt(process.env.ANALYTICS_COOKIE_DAYS || "365", 10) || 365, 1);
const CONSENT_COOKIE_NAME = process.env.ANALYTICS_CONSENT_COOKIE_NAME || "analytics_consent";
const VOLUNTARY_COOKIE_NAME = process.env.ANALYTICS_VOLUNTARY_COOKIE_NAME || "analytics_voluntary";

const DEFAULT_REGULATED_COUNTRY_CODES = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
  "IS", "LI", "NO",
  "GB", "CH",
];

const regulatedCountries = new Set(
  (process.env.ANALYTICS_REGULATED_COUNTRIES || DEFAULT_REGULATED_COUNTRY_CODES.join(","))
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean)
);

const getRequestCountry = (req) => String(
  req.headers["cf-ipcountry"]
  || req.headers["x-vercel-ip-country"]
  || req.headers["x-country-code"]
  || ""
).trim().toUpperCase();

const getConsentValue = (req) => String(req.cookies?.[CONSENT_COOKIE_NAME] || "").trim().toLowerCase();

const requiresExplicitConsent = (req) => regulatedCountries.has(getRequestCountry(req));

const isAnalyticsAllowed = (req) => {
  if (req.headers.dnt === "1") return false;
  if (req.cookies?.analytics_opt_out === "1") return false;

  const consentValue = getConsentValue(req);
  const needsOptIn = requiresExplicitConsent(req);

  if (needsOptIn) {
    return consentValue === "granted";
  }

  if (consentValue === "denied") {
    return false;
  }

  return true;
};

const getVoluntaryConsentValue = (req) => String(req.cookies?.[VOLUNTARY_COOKIE_NAME] || "").trim().toLowerCase();

const isVoluntaryAllowed = (req) => isAnalyticsAllowed(req) && getVoluntaryConsentValue(req) === "granted";

const setConsentCookie = (res, value) => {
  res.cookie(CONSENT_COOKIE_NAME, value, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: ANALYTICS_COOKIE_DAYS * 24 * 60 * 60 * 1000,
  });
};

const clearConsentCookie = (res) => {
  res.clearCookie(CONSENT_COOKIE_NAME, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
};

module.exports = {
  CONSENT_COOKIE_NAME,
  VOLUNTARY_COOKIE_NAME,
  getRequestCountry,
  getConsentValue,
  getVoluntaryConsentValue,
  requiresExplicitConsent,
  isAnalyticsAllowed,
  isVoluntaryAllowed,
  setConsentCookie,
  clearConsentCookie,
};
