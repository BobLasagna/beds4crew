const express = require("express");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const AnalyticsEvent = require("../models/AnalyticsEvent");
const { ACCESS_COOKIE_NAME, getJwtSecrets } = require("../utils/tokenHelpers");
const {
  CONSENT_COOKIE_NAME,
  VOLUNTARY_COOKIE_NAME,
  getRequestCountry,
  getConsentValue,
  getVoluntaryConsentValue,
  requiresExplicitConsent,
  isAnalyticsAllowed,
  isVoluntaryAllowed,
  setConsentCookie,
} = require("../utils/analyticsConsent");
const { getAnalyticsConfig, getPolicyCookieCatalog } = require("../utils/analyticsConfig");

const router = express.Router();

const analyticsConfig = getAnalyticsConfig();
const ANALYTICS_ENABLED = analyticsConfig.analyticsEnabled;
const ANALYTICS_COOKIE_NAME = analyticsConfig.cookieName;
const ANALYTICS_COOKIE_DAYS = analyticsConfig.cookieDays;
const ANALYTICS_HASH_SALT = analyticsConfig.hashSalt;
const ANALYTICS_STORE_RAW_IP = analyticsConfig.storeRawIp;
const DEDUPE_WINDOW_MS = analyticsConfig.dedupeWindowSeconds * 1000;

const hashValue = (value = "") => {
  if (!value) return "";
  return crypto.createHash("sha256").update(`${ANALYTICS_HASH_SALT}:${value}`).digest("hex");
};

const getRequestUserId = (req) => {
  const authHeaderToken = req.headers["authorization"]?.split(" ")[1];
  const cookieToken = req.cookies?.[ACCESS_COOKIE_NAME];
  const token = cookieToken || authHeaderToken;
  if (!token) return null;

  try {
    const { accessSecret } = getJwtSecrets();
    const decoded = jwt.verify(token, accessSecret);
    return decoded?.id || decoded?._id || null;
  } catch (error) {
    return null;
  }
};

const pickMetadata = (metadata = {}) => {
  if (!metadata || typeof metadata !== "object") return {};

  const keys = Object.keys(metadata).slice(0, 30);
  return keys.reduce((acc, key) => {
    const value = metadata[key];
    if (value === null || value === undefined) return acc;
    if (["string", "number", "boolean"].includes(typeof value)) {
      acc[key] = value;
    }
    return acc;
  }, {});
};

const normalizeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseUserAgent = (userAgent = "") => {
  const ua = String(userAgent || "");
  const browserChecks = [
    { name: "Edge", regex: /Edg\/([\d.]+)/i },
    { name: "Chrome", regex: /Chrome\/([\d.]+)/i },
    { name: "Firefox", regex: /Firefox\/([\d.]+)/i },
    { name: "Safari", regex: /Version\/([\d.]+).*Safari/i },
    { name: "Opera", regex: /OPR\/([\d.]+)/i },
  ];

  let browserName = "Unknown";
  let browserVersion = "";
  for (const check of browserChecks) {
    const match = ua.match(check.regex);
    if (match) {
      browserName = check.name;
      browserVersion = match[1] || "";
      break;
    }
  }

  let osName = "Unknown";
  if (/Windows NT/i.test(ua)) osName = "Windows";
  else if (/Mac OS X|Macintosh/i.test(ua)) osName = "macOS";
  else if (/Android/i.test(ua)) osName = "Android";
  else if (/iPhone|iPad|iPod/i.test(ua)) osName = "iOS";
  else if (/Linux/i.test(ua)) osName = "Linux";

  const deviceType = /Mobile|Android|iPhone|iPod/i.test(ua)
    ? "mobile"
    : /iPad|Tablet/i.test(ua)
      ? "tablet"
      : "desktop";

  return { browserName, browserVersion, osName, deviceType };
};

const getClientIp = (req) => {
  const xForwardedFor = String(req.headers["x-forwarded-for"] || "").trim();
  if (xForwardedFor) {
    const first = xForwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.ip || "";
};

const getIsp = (req) => String(
  req.headers["cf-isp"]
  || req.headers["x-isp"]
  || req.headers["x-forwarded-isp"]
  || ""
).slice(0, 180);

const getBucketStart = (date = new Date()) => {
  const time = date.getTime();
  const bucket = Math.floor(time / DEDUPE_WINDOW_MS) * DEDUPE_WINDOW_MS;
  return new Date(bucket);
};

const buildDedupeKey = (payload) => {
  const source = {
    visitorId: payload.visitorId,
    userId: payload.userId ? String(payload.userId) : "",
    method: payload.method,
    path: payload.path,
    statusCode: payload.statusCode,
    routeGroup: payload.routeGroup,
    eventType: payload.bodyMeta?.eventType || "",
    action: payload.bodyMeta?.action || "",
    sourceType: payload.bodyMeta?.source || "",
  };

  return hashValue(JSON.stringify(source));
};

router.get("/consent/status", (req, res) => {
  const country = getRequestCountry(req);
  const requiredOptIn = requiresExplicitConsent(req);
  const consentValue = getConsentValue(req);
  const analyticsAllowed = isAnalyticsAllowed(req);

  return res.status(200).json({
    country,
    requiredOptIn,
    consentCookieName: CONSENT_COOKIE_NAME,
    consentValue,
    voluntaryCookieName: VOLUNTARY_COOKIE_NAME,
    voluntaryConsentValue: getVoluntaryConsentValue(req),
    voluntaryAllowed: isVoluntaryAllowed(req),
    analyticsAllowed,
    dntEnabled: req.headers.dnt === "1",
    optedOut: req.cookies?.analytics_opt_out === "1",
  });
});

router.get("/cookie-policy", (req, res) => {
  const { config, cookies } = getPolicyCookieCatalog();
  const detectedCookieNames = new Set(Object.keys(req.cookies || {}));

  const cookiesWithPresence = cookies.map((cookie) => ({
    ...cookie,
    presentInRequest: detectedCookieNames.has(cookie.name),
  }));

  return res.status(200).json({
    generatedAt: new Date().toISOString(),
    analyticsEnabled: config.analyticsEnabled,
    capture: {
      browser: config.captureBrowser,
      userAgent: config.captureUserAgent,
      language: config.captureLanguage,
      timezone: config.captureTimezone,
      location: config.captureLocation,
      isp: config.captureIsp,
      ipHash: config.captureIpHash,
      rawIp: config.storeRawIp,
    },
    requireVoluntaryForAdvanced: config.requireVoluntaryForAdvanced,
    cookies: cookiesWithPresence,
  });
});

router.post("/consent", (req, res) => {
  const granted = Boolean(req.body?.analytics === true);

  if (granted) {
    setConsentCookie(res, "granted");
    res.clearCookie("analytics_opt_out", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
  } else {
    setConsentCookie(res, "denied");
    res.cookie("analytics_opt_out", "1", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: ANALYTICS_COOKIE_DAYS * 24 * 60 * 60 * 1000,
    });
    res.clearCookie(ANALYTICS_COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
  }

  return res.status(200).json({
    success: true,
    analyticsAllowed: granted,
    consentValue: granted ? "granted" : "denied",
  });
});

router.post("/consent/voluntary", (req, res) => {
  const enabled = Boolean(req.body?.enabled === true);

  res.cookie(VOLUNTARY_COOKIE_NAME, enabled ? "granted" : "denied", {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: ANALYTICS_COOKIE_DAYS * 24 * 60 * 60 * 1000,
  });

  return res.status(200).json({
    success: true,
    voluntaryAllowed: enabled,
    voluntaryConsentValue: enabled ? "granted" : "denied",
  });
});

router.post("/events", async (req, res) => {
  try {
    if (!ANALYTICS_ENABLED || !isAnalyticsAllowed(req)) {
      return res.status(202).json({ tracked: false });
    }

    const advancedAllowed = !analyticsConfig.requireVoluntaryForAdvanced || isVoluntaryAllowed(req);

    const inputEvents = Array.isArray(req.body?.events)
      ? req.body.events.slice(0, 100)
      : [req.body || {}];

    if (inputEvents.length === 0) {
      return res.status(202).json({ tracked: false, reason: "No events provided" });
    }

    const userAgent = String(req.headers["user-agent"] || "").slice(0, 300);
    const parsedUA = (advancedAllowed && analyticsConfig.captureBrowser)
      ? parseUserAgent(userAgent)
      : { browserName: "", browserVersion: "", osName: "", deviceType: "unknown" };
    const acceptLanguage = String(req.headers["accept-language"] || "");
    const language = (advancedAllowed && analyticsConfig.captureLanguage)
      ? String(req.body?.language || acceptLanguage.split(",")[0] || "").trim().slice(0, 24)
      : "";
    const timezone = (advancedAllowed && analyticsConfig.captureTimezone)
      ? String(req.body?.timezone || "").trim().slice(0, 80)
      : "";

    const clientIp = getClientIp(req);
    const isp = (advancedAllowed && analyticsConfig.captureIsp) ? getIsp(req) : "";

    let visitorId = req.cookies?.[ANALYTICS_COOKIE_NAME];
    if (!visitorId) {
      visitorId = crypto.randomUUID();
      res.cookie(ANALYTICS_COOKIE_NAME, visitorId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: ANALYTICS_COOKIE_DAYS * 24 * 60 * 60 * 1000,
      });
    }

    const now = new Date();
    const baseUserId = getRequestUserId(req);
    const referrer = String(req.headers.referer || req.headers.referrer || "").slice(0, 300);
    const fallbackCountry = (advancedAllowed && analyticsConfig.captureLocation)
      ? String(getRequestCountry(req) || "").slice(0, 60)
      : "";

    const aggregates = new Map();
    for (const rawEvent of inputEvents) {
      const eventType = String(rawEvent?.eventType || "custom").trim().slice(0, 80);
      const action = String(rawEvent?.action || "unknown").trim().slice(0, 120);
      const source = String(rawEvent?.source || "client").trim().slice(0, 120);
      const metadata = pickMetadata(rawEvent?.metadata || {});

      const latitude = (advancedAllowed && analyticsConfig.captureLocation)
        ? normalizeNumber(rawEvent?.location?.lat ?? rawEvent?.latitude)
        : null;
      const longitude = (advancedAllowed && analyticsConfig.captureLocation)
        ? normalizeNumber(rawEvent?.location?.lng ?? rawEvent?.longitude)
        : null;
      const country = (advancedAllowed && analyticsConfig.captureLocation)
        ? String(rawEvent?.location?.country || rawEvent?.country || "").slice(0, 60)
        : "";
      const region = (advancedAllowed && analyticsConfig.captureLocation)
        ? String(rawEvent?.location?.region || rawEvent?.region || "").slice(0, 120)
        : "";
      const city = (advancedAllowed && analyticsConfig.captureLocation)
        ? String(rawEvent?.location?.city || rawEvent?.city || "").slice(0, 120)
        : "";

      const locationSource = !(advancedAllowed && analyticsConfig.captureLocation)
        ? "disabled"
        : latitude !== null && longitude !== null
          ? "client-gps"
          : country || region || city
            ? "client-manual"
            : "none";

      const payload = {
        occurredAt: now,
        visitorId,
        userId: baseUserId,
        method: "CLIENT",
        path: "/api/analytics/events",
        routeGroup: "analytics/client",
        statusCode: 200,
        durationMs: 0,
        ipHash: (advancedAllowed && analyticsConfig.captureIpHash) ? hashValue(clientIp || "") : "",
        ipAddress: (advancedAllowed && ANALYTICS_STORE_RAW_IP) ? String(clientIp).slice(0, 80) : "",
        isp,
        userAgent: (advancedAllowed && analyticsConfig.captureUserAgent) ? userAgent : "",
        browserName: parsedUA.browserName,
        browserVersion: parsedUA.browserVersion,
        osName: parsedUA.osName,
        deviceType: parsedUA.deviceType,
        language,
        timezone,
        referrer,
        country: country || fallbackCountry,
        region,
        city,
        latitude,
        longitude,
        locationSource,
        queryParams: {},
        bodyMeta: {
          eventType,
          action,
          source,
          ...metadata,
        },
        searchTerm: "",
      };

      const bucketStart = getBucketStart(now);
      const dedupeKey = buildDedupeKey(payload);
      const aggregateKey = `${bucketStart.toISOString()}:${dedupeKey}`;

      if (!aggregates.has(aggregateKey)) {
        aggregates.set(aggregateKey, {
          ...payload,
          bucketStart,
          dedupeKey,
          occurrences: 1,
          totalDurationMs: 0,
          searchTerms: [],
        });
      } else {
        const existing = aggregates.get(aggregateKey);
        existing.occurrences += 1;
      }
    }

    const operations = Array.from(aggregates.values()).map((item) => ({
      updateOne: {
        filter: {
          bucketStart: item.bucketStart,
          dedupeKey: item.dedupeKey,
        },
        update: {
          $setOnInsert: {
            visitorId: item.visitorId,
            userId: item.userId,
            method: item.method,
            path: item.path,
            routeGroup: item.routeGroup,
            statusCode: item.statusCode,
            queryParams: item.queryParams,
            bodyMeta: item.bodyMeta,
            ipHash: item.ipHash,
            ipAddress: item.ipAddress,
            isp: item.isp,
            userAgent: item.userAgent,
            browserName: item.browserName,
            browserVersion: item.browserVersion,
            osName: item.osName,
            deviceType: item.deviceType,
            language: item.language,
            timezone: item.timezone,
            referrer: item.referrer,
            country: item.country,
            region: item.region,
            city: item.city,
            latitude: item.latitude,
            longitude: item.longitude,
            locationSource: item.locationSource,
            searchTerm: "",
            dedupeKey: item.dedupeKey,
            bucketStart: item.bucketStart,
          },
          $set: {
            occurredAt: now,
            durationMs: 0,
          },
          $inc: {
            occurrences: item.occurrences,
            totalDurationMs: 0,
          },
        },
        upsert: true,
      },
    }));

    if (operations.length > 0) {
      await AnalyticsEvent.bulkWrite(operations, { ordered: false });
    }

    return res.status(201).json({ tracked: true, accepted: inputEvents.length, deduped: operations.length });
  } catch (error) {
    return res.status(500).json({ message: "Failed to track event", error: error.message });
  }
});

router.post("/opt-out", (req, res) => {
  setConsentCookie(res, "denied");
  res.cookie("analytics_opt_out", "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: ANALYTICS_COOKIE_DAYS * 24 * 60 * 60 * 1000,
  });

  res.clearCookie(ANALYTICS_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

  return res.status(200).json({ success: true, trackingEnabled: false });
});

router.post("/opt-in", (req, res) => {
  setConsentCookie(res, "granted");
  res.clearCookie("analytics_opt_out", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

  return res.status(200).json({ success: true, trackingEnabled: true });
});

module.exports = router;
