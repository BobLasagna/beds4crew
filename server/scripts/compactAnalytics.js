#!/usr/bin/env node

require("dotenv").config();
const crypto = require("crypto");
const mongoose = require("mongoose");
const AnalyticsEvent = require("../models/AnalyticsEvent");

const parseArgs = () => {
  const args = process.argv.slice(2);
  const values = {
    dryRun: args.includes("--dry-run"),
    batchSize: 1000,
    maxDocs: 0,
    from: null,
    to: null,
  };

  for (const arg of args) {
    if (arg.startsWith("--batch-size=")) {
      values.batchSize = Math.max(parseInt(arg.split("=")[1], 10) || 1000, 50);
    }
    if (arg.startsWith("--max-docs=")) {
      values.maxDocs = Math.max(parseInt(arg.split("=")[1], 10) || 0, 0);
    }
    if (arg.startsWith("--from=")) {
      const parsed = new Date(arg.split("=")[1]);
      if (!Number.isNaN(parsed.getTime())) values.from = parsed;
    }
    if (arg.startsWith("--to=")) {
      const parsed = new Date(arg.split("=")[1]);
      if (!Number.isNaN(parsed.getTime())) values.to = parsed;
    }
  }

  return values;
};

const buildRouteGroup = (path = "") => {
  const normalized = String(path || "").split("?")[0];
  const segments = normalized.split("/").filter(Boolean);
  return segments.length >= 2 ? `${segments[0]}/${segments[1]}` : segments[0] || "api";
};

const getBucketStart = (date, dedupeWindowMs) => {
  const safeDate = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
  const bucketMs = Math.floor(safeDate.getTime() / dedupeWindowMs) * dedupeWindowMs;
  return new Date(bucketMs);
};

const main = async () => {
  const options = parseArgs();
  const hashSalt = process.env.ANALYTICS_HASH_SALT || "beds4crew-default-analytics-salt";
  const dedupeWindowSeconds = Math.max(parseInt(process.env.ANALYTICS_DEDUPE_WINDOW_SECONDS || "60", 10) || 60, 5);
  const dedupeWindowMs = dedupeWindowSeconds * 1000;

  if (!process.env.MONGO_URL) {
    throw new Error("MONGO_URL is required");
  }

  await mongoose.connect(process.env.MONGO_URL);

  const legacyFilter = {
    $or: [
      { dedupeKey: { $exists: false } },
      { dedupeKey: "" },
      { bucketStart: { $exists: false } },
      { occurrences: { $exists: false } },
    ],
  };

  if (options.from || options.to) {
    legacyFilter.occurredAt = {};
    if (options.from) legacyFilter.occurredAt.$gte = options.from;
    if (options.to) legacyFilter.occurredAt.$lte = options.to;
  }

  const cursor = AnalyticsEvent.find(legacyFilter)
    .sort({ _id: 1 })
    .lean()
    .cursor();

  let processedDocs = 0;
  let removedDocs = 0;
  let aggregatedWrites = 0;
  let mergedOccurrences = 0;

  while (true) {
    const chunk = [];

    while (chunk.length < options.batchSize) {
      if (options.maxDocs > 0 && processedDocs >= options.maxDocs) break;
      const next = await cursor.next();
      if (!next) break;
      chunk.push(next);
      processedDocs += 1;
    }

    if (chunk.length === 0) break;

    const grouped = new Map();

    for (const doc of chunk) {
      const occurredAt = doc.occurredAt ? new Date(doc.occurredAt) : new Date();
      const bucketStart = doc.bucketStart ? new Date(doc.bucketStart) : getBucketStart(occurredAt, dedupeWindowMs);

      const dedupeSource = {
        visitorId: doc.visitorId || "",
        userId: doc.userId ? String(doc.userId) : "",
        method: doc.method || "GET",
        path: doc.path || "",
        statusCode: Number(doc.statusCode) || 200,
        routeGroup: doc.routeGroup || buildRouteGroup(doc.path || ""),
        searchTerm: doc.searchTerm || "",
        eventType: doc.bodyMeta?.eventType || "",
        action: doc.bodyMeta?.action || "",
      };

      const dedupeKey = doc.dedupeKey || crypto.createHash("sha256")
        .update(`${hashSalt}:${JSON.stringify(dedupeSource)}`)
        .digest("hex");

      const occurrences = Math.max(Number(doc.occurrences) || 1, 1);
      const totalDurationMs = Number.isFinite(Number(doc.totalDurationMs)) && Number(doc.totalDurationMs) > 0
        ? Number(doc.totalDurationMs)
        : (Number(doc.durationMs) || 0) * occurrences;

      const key = `${bucketStart.toISOString()}:${dedupeKey}`;
      const existing = grouped.get(key);

      const baseSearchTerms = [];
      if (Array.isArray(doc.searchTerms)) {
        baseSearchTerms.push(...doc.searchTerms.filter(Boolean).map((value) => String(value).slice(0, 200)));
      }
      if (doc.searchTerm) {
        baseSearchTerms.push(String(doc.searchTerm).slice(0, 200));
      }

      if (!existing) {
        grouped.set(key, {
          bucketStart,
          dedupeKey,
          occurredAt,
          visitorId: doc.visitorId || "unknown",
          userId: doc.userId || null,
          method: doc.method || "GET",
          path: doc.path || "",
          routeGroup: doc.routeGroup || buildRouteGroup(doc.path || ""),
          statusCode: Number(doc.statusCode) || 200,
          queryParams: doc.queryParams || {},
          bodyMeta: doc.bodyMeta || {},
          ipHash: doc.ipHash || "",
          ipAddress: doc.ipAddress || "",
          isp: doc.isp || "",
          userAgent: doc.userAgent || "",
          browserName: doc.browserName || "",
          browserVersion: doc.browserVersion || "",
          osName: doc.osName || "",
          deviceType: doc.deviceType || "unknown",
          language: doc.language || "",
          timezone: doc.timezone || "",
          referrer: doc.referrer || "",
          country: doc.country || "",
          region: doc.region || "",
          city: doc.city || "",
          latitude: doc.latitude ?? null,
          longitude: doc.longitude ?? null,
          locationSource: doc.locationSource || "",
          searchTerm: doc.searchTerm || "",
          searchTerms: Array.from(new Set(baseSearchTerms)).slice(0, 25),
          occurrences,
          totalDurationMs,
        });
      } else {
        existing.occurrences += occurrences;
        existing.totalDurationMs += totalDurationMs;
        if (occurredAt > existing.occurredAt) {
          existing.occurredAt = occurredAt;
        }

        const mergedTerms = new Set(existing.searchTerms);
        for (const term of baseSearchTerms) {
          if (mergedTerms.size >= 25) break;
          mergedTerms.add(term);
        }
        existing.searchTerms = Array.from(mergedTerms);
      }
    }

    const operations = Array.from(grouped.values()).map((item) => ({
      updateOne: {
        filter: {
          bucketStart: item.bucketStart,
          dedupeKey: item.dedupeKey,
        },
        update: {
          $setOnInsert: {
            bucketStart: item.bucketStart,
            dedupeKey: item.dedupeKey,
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
          },
          $set: {
            occurredAt: item.occurredAt,
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

    if (!options.dryRun && operations.length > 0) {
      await AnalyticsEvent.bulkWrite(operations, { ordered: false });
      const ids = chunk.map((doc) => doc._id);
      const deleteResult = await AnalyticsEvent.deleteMany({ _id: { $in: ids } });
      removedDocs += deleteResult.deletedCount || 0;
    }

    aggregatedWrites += operations.length;
    mergedOccurrences += chunk.length;

    console.log(
      `[compact] chunk processed=${chunk.length} grouped=${operations.length}`
      + `${options.dryRun ? " (dry-run)" : ""}`
    );

    if (options.maxDocs > 0 && processedDocs >= options.maxDocs) {
      break;
    }
  }

  await cursor.close();
  await mongoose.disconnect();

  console.log("\n[compact] done");
  console.log(`[compact] dryRun=${options.dryRun}`);
  console.log(`[compact] processedDocs=${processedDocs}`);
  console.log(`[compact] groupedWrites=${aggregatedWrites}`);
  console.log(`[compact] mergedOccurrences=${mergedOccurrences}`);
  if (!options.dryRun) {
    console.log(`[compact] removedLegacyDocs=${removedDocs}`);
  }
};

main().catch(async (error) => {
  console.error("[compact] failed:", error.message);
  try {
    await mongoose.disconnect();
  } catch (disconnectError) {
    // ignore
  }
  process.exit(1);
});
