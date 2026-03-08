const mongoose = require("mongoose");

const AnalyticsEventSchema = new mongoose.Schema(
  {
    occurredAt: { type: Date, default: Date.now, index: true },
    bucketStart: { type: Date, default: Date.now, index: true },
    dedupeKey: { type: String, default: "", index: true },
    occurrences: { type: Number, default: 1, min: 1, index: true },
    totalDurationMs: { type: Number, default: 0 },
    visitorId: { type: String, required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    method: { type: String, required: true, index: true },
    path: { type: String, required: true, index: true },
    routeGroup: { type: String, default: "api", index: true },
    statusCode: { type: Number, required: true, index: true },
    durationMs: { type: Number, default: 0 },
    ipHash: { type: String, default: "", index: true },
    ipAddress: { type: String, default: "", index: true },
    isp: { type: String, default: "", index: true },
    userAgent: { type: String, default: "" },
    browserName: { type: String, default: "", index: true },
    browserVersion: { type: String, default: "" },
    osName: { type: String, default: "", index: true },
    deviceType: { type: String, default: "unknown", index: true },
    language: { type: String, default: "" },
    timezone: { type: String, default: "" },
    referrer: { type: String, default: "" },
    country: { type: String, default: "", index: true },
    region: { type: String, default: "" },
    city: { type: String, default: "" },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    locationSource: { type: String, default: "", index: true },
    queryParams: { type: mongoose.Schema.Types.Mixed, default: {} },
    bodyMeta: { type: mongoose.Schema.Types.Mixed, default: {} },
    searchTerm: { type: String, default: "", index: true },
    searchTerms: { type: [String], default: [] },
  },
  { minimize: false }
);

AnalyticsEventSchema.index({ occurredAt: -1, path: 1 });
AnalyticsEventSchema.index({ bucketStart: -1, dedupeKey: 1 }, { unique: true, sparse: true });
AnalyticsEventSchema.index({ occurredAt: -1, searchTerm: 1 });
AnalyticsEventSchema.index({ occurredAt: -1, country: 1, city: 1 });
AnalyticsEventSchema.index({ occurredAt: -1, browserName: 1, osName: 1 });
AnalyticsEventSchema.index({ occurredAt: -1, isp: 1 });

module.exports = mongoose.model("AnalyticsEvent", AnalyticsEventSchema);
