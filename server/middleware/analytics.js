const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const AnalyticsEvent = require("../models/AnalyticsEvent");
const { ACCESS_COOKIE_NAME, getJwtSecrets } = require("../utils/tokenHelpers");
const { isAnalyticsAllowed, isVoluntaryAllowed, getRequestCountry } = require("../utils/analyticsConsent");
const { getAnalyticsConfig } = require("../utils/analyticsConfig");

const analyticsConfig = getAnalyticsConfig();
const ANALYTICS_ENABLED = analyticsConfig.analyticsEnabled;
const ANALYTICS_COOKIE_NAME = analyticsConfig.cookieName;
const ANALYTICS_COOKIE_DAYS = analyticsConfig.cookieDays;
const ANALYTICS_TRACK_PATH_PREFIX = analyticsConfig.trackPathPrefix;
const ANALYTICS_HASH_SALT = analyticsConfig.hashSalt;
const ANALYTICS_STORE_RAW_IP = analyticsConfig.storeRawIp;
const DEDUPE_WINDOW_MS = analyticsConfig.dedupeWindowSeconds * 1000;
const QUERY_ALLOWLIST = (process.env.ANALYTICS_QUERY_ALLOWLIST || "q,query,search,category,type,sort,page,limit,lat,lng,radius,minPrice,maxPrice,minRating,instantBook")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const BODY_META_ALLOWLIST = (process.env.ANALYTICS_BODY_META_ALLOWLIST || "eventType,action,source")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const bufferedAggregates = new Map();

const buildRouteGroup = (path = "") => {
  const normalized = String(path || "").split("?")[0];
  const segments = normalized.split("/").filter(Boolean);
  return segments.length >= 2 ? `${segments[0]}/${segments[1]}` : segments[0] || "api";
};

const hashValue = (value = "") => {
  if (!value) return "";
  return crypto.createHash("sha256").update(`${ANALYTICS_HASH_SALT}:${value}`).digest("hex");
};

const getRequestUserId = (req) => {
  if (req.user?.id) return req.user.id;
  if (req.user?._id) return req.user._id;

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

const pickAllowedFields = (source = {}, allowedKeys = []) => {
  const output = {};
  allowedKeys.forEach((key) => {
    if (source[key] !== undefined && source[key] !== null && source[key] !== "") {
      output[key] = source[key];
    }
  });
  return output;
};

const normalizeSearchTerm = (query = {}) => {
  const candidate = query.query || query.q || query.search || "";
  return String(candidate || "").trim().toLowerCase().slice(0, 200);
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

const normalizeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const extractLocation = (req) => {
  const country = String(getRequestCountry(req) || "").slice(0, 60);
  const region = String(req.headers["x-vercel-ip-country-region"] || "").slice(0, 120);
  const city = String(req.headers["x-vercel-ip-city"] || "").slice(0, 120);

  const latitude = normalizeNumber(req.query?.lat);
  const longitude = normalizeNumber(req.query?.lng);

  let locationSource = "none";
  if (latitude !== null && longitude !== null) {
    locationSource = "query";
  } else if (country || region || city) {
    locationSource = "ip-header";
  }

  return {
    country,
    region,
    city,
    latitude,
    longitude,
    locationSource,
  };
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

const isIgnoredPath = (path = "") => analyticsConfig.ignorePaths.some((ignorePath) => path.startsWith(ignorePath));

const isTrackableRequest = (req) => {
  if (!analyticsConfig.trackMethods.includes(String(req.method || "").toUpperCase())) {
    return false;
  }

  if (!req.path.startsWith(ANALYTICS_TRACK_PATH_PREFIX)) {
    return false;
  }

  if (isIgnoredPath(req.path)) {
    return false;
  }

  if (
    req.path === "/api/analytics/events"
    || req.path === "/api/analytics/opt-out"
    || req.path === "/api/analytics/opt-in"
    || req.path === "/api/analytics/consent"
  ) {
    return false;
  }

  return true;
};

const getBucketStart = (date = new Date()) => {
  const time = date.getTime();
  const bucket = Math.floor(time / DEDUPE_WINDOW_MS) * DEDUPE_WINDOW_MS;
  return new Date(bucket);
};

const buildDedupeKey = (payload) => {
  const dedupeSource = {
    visitorId: payload.visitorId,
    userId: payload.userId ? String(payload.userId) : "",
    method: payload.method,
    path: payload.path,
    statusCode: payload.statusCode,
    routeGroup: payload.routeGroup,
    searchTerm: payload.searchTerm || "",
    eventType: payload.bodyMeta?.eventType || "",
    action: payload.bodyMeta?.action || "",
  };

  return hashValue(JSON.stringify(dedupeSource));
};

const addBufferedAggregate = (payload) => {
  const bucketStart = getBucketStart(payload.occurredAt);
  const dedupeKey = buildDedupeKey(payload);
  const mapKey = `${bucketStart.toISOString()}:${dedupeKey}`;

  if (bufferedAggregates.size >= analyticsConfig.maxBufferedKeys && !bufferedAggregates.has(mapKey)) {
    return;
  }

  const existing = bufferedAggregates.get(mapKey);
  if (!existing) {
    bufferedAggregates.set(mapKey, {
      ...payload,
      dedupeKey,
      bucketStart,
      occurrences: 1,
      totalDurationMs: payload.durationMs || 0,
      searchTerms: payload.searchTerm ? [payload.searchTerm] : [],
      lastOccurredAt: payload.occurredAt,
    });
    return;
  }

  existing.occurrences += 1;
  existing.totalDurationMs += payload.durationMs || 0;
  existing.lastOccurredAt = payload.occurredAt;
  existing.durationMs = Math.round(existing.totalDurationMs / existing.occurrences);

  if (payload.searchTerm && !existing.searchTerms.includes(payload.searchTerm) && existing.searchTerms.length < 10) {
    existing.searchTerms.push(payload.searchTerm);
  }
};

const flushBufferedAggregates = async () => {
  if (bufferedAggregates.size === 0) return;

  const pendingItems = Array.from(bufferedAggregates.values());
  bufferedAggregates.clear();

  const operations = pendingItems.map((item) => ({
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
          searchTerm: item.searchTerm,
          dedupeKey: item.dedupeKey,
          bucketStart: item.bucketStart,
        },
        $set: {
          occurredAt: item.lastOccurredAt,
          durationMs: Math.round(item.totalDurationMs / Math.max(item.occurrences, 1)),
        },
        $inc: {
          occurrences: item.occurrences,
          totalDurationMs: item.totalDurationMs,
        },
        ...(item.searchTerms.length > 0 ? { $addToSet: { searchTerms: { $each: item.searchTerms } } } : {}),
      },
      upsert: true,
    },
  }));

  try {
    await AnalyticsEvent.bulkWrite(operations, { ordered: false });
  } catch (error) {
    console.error("Analytics bulk flush failed:", error.message);
  }
};

setInterval(() => {
  flushBufferedAggregates().catch((error) => {
    console.error("Analytics flush interval failed:", error.message);
  });
}, analyticsConfig.flushIntervalMs).unref();

const analyticsMiddleware = (req, res, next) => {
  if (!ANALYTICS_ENABLED) {
    return next();
  }

  if (!isTrackableRequest(req)) {
    return next();
  }

  if (!isAnalyticsAllowed(req)) {
    return next();
  }

  const startedAt = Date.now();
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

  const queryParams = pickAllowedFields(req.query || {}, QUERY_ALLOWLIST);
  const bodyMeta = req.body && typeof req.body === "object"
    ? pickAllowedFields(req.body, BODY_META_ALLOWLIST)
    : {};
  const searchTerm = normalizeSearchTerm(req.query || {});

  const advancedAllowed = !analyticsConfig.requireVoluntaryForAdvanced || isVoluntaryAllowed(req);
  const userAgent = String(req.headers["user-agent"] || "").slice(0, 300);
  const { browserName, browserVersion, osName, deviceType } = (advancedAllowed && analyticsConfig.captureBrowser)
    ? parseUserAgent(userAgent)
    : { browserName: "", browserVersion: "", osName: "", deviceType: "unknown" };

  const acceptLanguage = String(req.headers["accept-language"] || "");
  const language = (advancedAllowed && analyticsConfig.captureLanguage)
    ? (acceptLanguage.split(",")[0]?.trim().slice(0, 24) || "")
    : "";
  const timezone = (advancedAllowed && analyticsConfig.captureTimezone)
    ? String(req.headers["x-timezone"] || "").slice(0, 80)
    : "";
  const location = (advancedAllowed && analyticsConfig.captureLocation)
    ? extractLocation(req)
    : {
        country: "",
        region: "",
        city: "",
        latitude: null,
        longitude: null,
        locationSource: "none",
      };

  const clientIp = getClientIp(req);
  const isp = (advancedAllowed && analyticsConfig.captureIsp) ? getIsp(req) : "";

  res.on("finish", () => {
    const statusCode = res.statusCode;
    const durationMs = Math.max(Date.now() - startedAt, 0);

    const payload = {
      occurredAt: new Date(),
      visitorId,
      userId: getRequestUserId(req),
      method: req.method,
      path: req.path,
      routeGroup: buildRouteGroup(req.path),
      statusCode,
      durationMs,
      ipHash: (advancedAllowed && analyticsConfig.captureIpHash) ? hashValue(clientIp || "") : "",
      ipAddress: (advancedAllowed && ANALYTICS_STORE_RAW_IP) ? String(clientIp).slice(0, 80) : "",
      isp,
      userAgent: (advancedAllowed && analyticsConfig.captureUserAgent) ? userAgent : "",
      browserName,
      browserVersion,
      osName,
      deviceType,
      language,
      timezone,
      referrer: String(req.headers.referer || req.headers.referrer || "").slice(0, 300),
      country: location.country,
      region: location.region,
      city: location.city,
      latitude: location.latitude,
      longitude: location.longitude,
      locationSource: location.locationSource,
      queryParams,
      bodyMeta,
      searchTerm,
    };

    addBufferedAggregate(payload);

    if (bufferedAggregates.size >= Math.floor(analyticsConfig.maxBufferedKeys * 0.8)) {
      flushBufferedAggregates().catch((error) => {
        console.error("Analytics flush threshold failed:", error.message);
      });
    }
  });

  next();
};

module.exports = analyticsMiddleware;
