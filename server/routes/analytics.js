const express = require("express");
const verifyToken = require("../middleware/auth");
const { verifyAdmin } = require("../middleware/auth");
const AnalyticsEvent = require("../models/AnalyticsEvent");

const router = express.Router();
const weightedCountExpr = { $ifNull: ["$occurrences", 1] };
const weightedDurationExpr = {
  $cond: [
    { $gt: [{ $ifNull: ["$totalDurationMs", 0] }, 0] },
    { $ifNull: ["$totalDurationMs", 0] },
    { $ifNull: ["$durationMs", 0] },
  ],
};

const parseWindow = (req) => {
  const now = new Date();
  const days = Math.max(parseInt(req.query.days, 10) || 30, 1);
  const from = req.query.from ? new Date(req.query.from) : new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const to = req.query.to ? new Date(req.query.to) : now;

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return { error: "Invalid date format. Use ISO format for from/to." };
  }

  return { from, to };
};

router.get("/summary", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const window = parseWindow(req);
    if (window.error) {
      return res.status(400).json({ message: window.error });
    }

    const { from, to } = window;
    const match = { occurredAt: { $gte: from, $lte: to } };

    const [totals, topPaths, topRouteGroups, topStatusCodes, topBrowsers, topLocations, topIsps, topIpAddresses, topIpHashes] = await Promise.all([
      AnalyticsEvent.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalEvents: { $sum: weightedCountExpr },
            uniqueVisitors: { $addToSet: "$visitorId" },
            uniqueUsers: { $addToSet: "$userId" },
            totalDurationMs: { $sum: weightedDurationExpr },
          },
        },
        {
          $project: {
            _id: 0,
            totalEvents: 1,
            uniqueVisitors: { $size: "$uniqueVisitors" },
            uniqueUsers: {
              $size: {
                $filter: {
                  input: "$uniqueUsers",
                  as: "user",
                  cond: { $ne: ["$$user", null] },
                },
              },
            },
            avgLatencyMs: {
              $round: [
                {
                  $cond: [
                    { $gt: ["$totalEvents", 0] },
                    { $divide: ["$totalDurationMs", "$totalEvents"] },
                    0,
                  ],
                },
                2,
              ],
            },
          },
        },
      ]),
      AnalyticsEvent.aggregate([
        { $match: match },
        { $group: { _id: "$path", count: { $sum: weightedCountExpr } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]),
      AnalyticsEvent.aggregate([
        { $match: match },
        { $group: { _id: "$routeGroup", count: { $sum: weightedCountExpr } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]),
      AnalyticsEvent.aggregate([
        { $match: match },
        { $group: { _id: "$statusCode", count: { $sum: weightedCountExpr } } },
        { $sort: { count: -1 } },
      ]),
      AnalyticsEvent.aggregate([
        { $match: match },
        { $group: { _id: { browserName: "$browserName", osName: "$osName", deviceType: "$deviceType" }, count: { $sum: weightedCountExpr } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]),
      AnalyticsEvent.aggregate([
        { $match: match },
        { $group: { _id: { country: "$country", region: "$region", city: "$city" }, count: { $sum: weightedCountExpr } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]),
      AnalyticsEvent.aggregate([
        { $match: match },
        { $group: { _id: "$isp", count: { $sum: weightedCountExpr } } },
        { $match: { _id: { $nin: ["", null] } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]),
      AnalyticsEvent.aggregate([
        { $match: match },
        { $group: { _id: "$ipAddress", count: { $sum: weightedCountExpr } } },
        { $match: { _id: { $nin: ["", null] } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]),
      AnalyticsEvent.aggregate([
        { $match: match },
        { $group: { _id: "$ipHash", count: { $sum: weightedCountExpr } } },
        { $match: { _id: { $nin: ["", null] } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]),
    ]);

    return res.json({
      window: { from, to },
      totals: totals[0] || { totalEvents: 0, uniqueVisitors: 0, uniqueUsers: 0, avgLatencyMs: 0 },
      topPaths,
      topRouteGroups,
      topStatusCodes,
      topBrowsers,
      topLocations,
      topIsps,
      topIpAddresses,
      topIpHashes,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load analytics summary", error: error.message });
  }
});

router.get("/top-searches", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const window = parseWindow(req);
    if (window.error) {
      return res.status(400).json({ message: window.error });
    }

    const { from, to } = window;
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 200);

    const topSearches = await AnalyticsEvent.aggregate([
      {
        $match: {
          occurredAt: { $gte: from, $lte: to },
          searchTerm: { $nin: ["", null] },
        },
      },
      { $group: { _id: "$searchTerm", count: { $sum: weightedCountExpr }, uniqueVisitors: { $addToSet: "$visitorId" } } },
      {
        $project: {
          _id: 0,
          searchTerm: "$_id",
          count: 1,
          uniqueVisitors: { $size: "$uniqueVisitors" },
        },
      },
      { $sort: { count: -1 } },
      { $limit: limit },
    ]);

    return res.json({ window: { from, to }, items: topSearches });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load top searches", error: error.message });
  }
});

router.get("/events", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const window = parseWindow(req);
    if (window.error) {
      return res.status(400).json({ message: window.error });
    }

    const { from, to } = window;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
    const skip = (page - 1) * limit;

    const criteria = {
      occurredAt: { $gte: from, $lte: to },
    };

    if (req.query.path) {
      criteria.path = req.query.path;
    }

    if (req.query.statusCode) {
      criteria.statusCode = parseInt(req.query.statusCode, 10);
    }

    const [items, total] = await Promise.all([
      AnalyticsEvent.find(criteria)
        .sort({ occurredAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AnalyticsEvent.countDocuments(criteria),
    ]);

    return res.json({
      window: { from, to },
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load analytics events", error: error.message });
  }
});

module.exports = router;
