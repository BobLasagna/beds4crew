const express = require("express");
const User = require("../models/User");
const verifyToken = require("../middleware/auth");

const router = express.Router();

const DEFAULT_NOTIFICATION_PREFERENCES = {
  inAppEnabled: true,
  pushEnabled: true,
  bookingConfirmation: true,
  bookingCancellation: true,
  newBookingRequest: true,
  newMessage: true,
  marketingUpdates: true,
};

const ALLOWED_PREFERENCE_KEYS = Object.keys(DEFAULT_NOTIFICATION_PREFERENCES);
const ALLOWED_PLATFORMS = new Set(["ios", "android", "web"]);
const ALLOWED_PROVIDERS = new Set(["fcm", "apns", "expo", "unknown"]);

const sanitizePushToken = (entry = {}) => ({
  token: entry.token,
  platform: entry.platform,
  provider: entry.provider || "unknown",
  deviceId: entry.deviceId || "",
  appVersion: entry.appVersion || "",
  createdAt: entry.createdAt,
  lastSeenAt: entry.lastSeenAt,
});

router.get("/preferences", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("emailPreferences notificationPreferences")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      notificationPreferences: {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        ...(user.notificationPreferences || {}),
      },
      emailPreferences: user.emailPreferences || {},
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch notification preferences",
      error: error.message,
    });
  }
});

router.put("/preferences", verifyToken, async (req, res) => {
  try {
    const { preferences } = req.body || {};

    if (!preferences || typeof preferences !== "object") {
      return res.status(400).json({ message: "Preferences object is required" });
    }

    const updates = {};
    for (const key of ALLOWED_PREFERENCE_KEYS) {
      if (Object.prototype.hasOwnProperty.call(preferences, key)) {
        if (typeof preferences[key] !== "boolean") {
          return res.status(400).json({ message: `Preference '${key}' must be boolean` });
        }
        updates[`notificationPreferences.${key}`] = preferences[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid notification preferences provided" });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true }
    ).select("notificationPreferences");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      message: "Notification preferences updated successfully",
      notificationPreferences: {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        ...(user.notificationPreferences?.toObject?.() || user.notificationPreferences || {}),
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update notification preferences",
      error: error.message,
    });
  }
});

router.get("/device-tokens", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("pushTokens").lean();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      tokens: (user.pushTokens || []).map(sanitizePushToken),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch device tokens", error: error.message });
  }
});

router.post("/device-tokens/register", verifyToken, async (req, res) => {
  try {
    const { token, platform, provider = "unknown", deviceId = "", appVersion = "" } = req.body || {};

    if (!token || typeof token !== "string") {
      return res.status(400).json({ message: "Valid token is required" });
    }

    if (!platform || !ALLOWED_PLATFORMS.has(platform)) {
      return res.status(400).json({ message: "Valid platform is required (ios, android, web)" });
    }

    if (!ALLOWED_PROVIDERS.has(provider)) {
      return res.status(400).json({ message: "Invalid provider" });
    }

    const user = await User.findById(req.user.id).select("pushTokens");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const now = new Date();
    const existingToken = (user.pushTokens || []).find(
      (entry) => entry.token === token && entry.platform === platform
    );

    if (existingToken) {
      existingToken.provider = provider;
      existingToken.deviceId = deviceId;
      existingToken.appVersion = appVersion;
      existingToken.lastSeenAt = now;
    } else {
      user.pushTokens.push({
        token,
        platform,
        provider,
        deviceId,
        appVersion,
        createdAt: now,
        lastSeenAt: now,
      });
    }

    await user.save();

    const savedToken = user.pushTokens.find((entry) => entry.token === token && entry.platform === platform);

    return res.json({
      message: "Push token registered successfully",
      token: sanitizePushToken(savedToken || { token, platform, provider, deviceId, appVersion, createdAt: now, lastSeenAt: now }),
      totalTokens: user.pushTokens.length,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to register push token", error: error.message });
  }
});

router.delete("/device-tokens/unregister", verifyToken, async (req, res) => {
  try {
    const { token, platform, deviceId } = req.body || {};

    if (!token && !deviceId) {
      return res.status(400).json({ message: "Provide token or deviceId for unregistration" });
    }

    if (platform && !ALLOWED_PLATFORMS.has(platform)) {
      return res.status(400).json({ message: "Invalid platform" });
    }

    const user = await User.findById(req.user.id).select("pushTokens");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const beforeCount = user.pushTokens.length;
    user.pushTokens = user.pushTokens.filter((entry) => {
      const tokenMatch = token ? entry.token === token : true;
      const platformMatch = platform ? entry.platform === platform : true;
      const deviceMatch = deviceId ? entry.deviceId === deviceId : true;

      return !(tokenMatch && platformMatch && deviceMatch);
    });

    const removedCount = beforeCount - user.pushTokens.length;
    if (removedCount === 0) {
      return res.status(404).json({ message: "No matching token binding found" });
    }

    await user.save();

    return res.json({
      message: "Push token unregistered successfully",
      removedCount,
      totalTokens: user.pushTokens.length,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to unregister push token", error: error.message });
  }
});

module.exports = router;
