const crypto = require("crypto");
const express = require("express");
const mongoose = require("mongoose");
const verifyToken = require("../middleware/auth");
const Booking = require("../models/Booking");
const Review = require("../models/Review");

const router = express.Router();

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

const markUnreadForOtherParty = (booking, actorId) => {
  if (booking.guest.toString() === actorId) {
    booking.unreadByHost = true;
    booking.unreadByGuest = false;
  } else {
    booking.unreadByGuest = true;
    booking.unreadByHost = false;
  }
};

const findBookingByReviewToken = async (token) => {
  const tokenHash = hashToken(token);
  return Booking.findOne({
    "finalization.reviewTokenHash": tokenHash,
    "finalization.reviewTokenExpiresAt": { $gt: new Date() },
  })
    .populate("property", "title")
    .populate("guest", "firstName lastName")
    .populate("host", "firstName lastName");
};

router.get("/property/:propertyId", async (req, res) => {
  try {
    const { propertyId } = req.params;
    const hasPagination = req.query.page !== undefined || req.query.limit !== undefined;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
    const skip = (page - 1) * limit;

    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
      return res.status(400).json({ message: "Invalid property id" });
    }

    const baseQuery = { property: propertyId, status: "approved" };
    const reviewQuery = Review.find(baseQuery)
      .populate("reviewer", "firstName lastName")
      .sort({ publishedAt: -1, createdAt: -1 })
      .lean();

    const toPublicPayload = (review) => ({
      id: review._id,
      rating: review.rating,
      comment: review.comment || "",
      anonymous: Boolean(review.anonymous),
      reviewerName: review.anonymous
        ? "Anonymous"
        : `${review.reviewer?.firstName || ""} ${review.reviewer?.lastName || ""}`.trim() || "User",
      createdAt: review.createdAt,
      publishedAt: review.publishedAt,
    });

    if (!hasPagination) {
      const reviews = await reviewQuery;
      return res.json(reviews.map(toPublicPayload));
    }

    const [reviews, total] = await Promise.all([
      reviewQuery.skip(skip).limit(limit),
      Review.countDocuments(baseQuery),
    ]);

    return res.json({
      items: reviews.map(toPublicPayload),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch property reviews", error: error.message });
  }
});

router.get("/token/:token", verifyToken, async (req, res) => {
  try {
    const booking = await findBookingByReviewToken(req.params.token);

    if (!booking) {
      return res.status(404).json({ message: "Review link is invalid or expired" });
    }

    if (booking.finalization?.selectedBy?.toString() !== req.user.id) {
      return res.status(403).json({ message: "This review link is not assigned to your account" });
    }

    const alreadyReviewed = await Review.findOne({ booking: booking._id, reviewer: req.user.id }).lean();
    if (alreadyReviewed) {
      return res.status(400).json({ message: "You have already submitted this review" });
    }

    const reviewingAsGuest = booking.guest._id.toString() === req.user.id;
    const guestReviewed = Boolean(booking.finalization?.guestReviewedAt);

    if (!reviewingAsGuest && !guestReviewed) {
      return res.status(400).json({ message: "Host review is available only after guest review" });
    }

    const reviewTarget = reviewingAsGuest ? booking.host : booking.guest;

    return res.json({
      bookingId: booking._id,
      propertyTitle: booking.property?.title || "Property",
      reviewTargetName: `${reviewTarget?.firstName || ""} ${reviewTarget?.lastName || ""}`.trim() || "User",
      anonymous: reviewingAsGuest ? Boolean(booking.finalization?.anonymous) : false,
      expiresAt: booking.finalization?.reviewTokenExpiresAt,
      reviewFlow: reviewingAsGuest ? "guest_to_host" : "host_to_guest",
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load review link", error: error.message });
  }
});

router.post("/token/:token", verifyToken, async (req, res) => {
  try {
    const { rating, comment } = req.body || {};
    const normalizedRating = Number(rating);

    if (!Number.isInteger(normalizedRating) || normalizedRating < 1 || normalizedRating > 5) {
      return res.status(400).json({ message: "Rating must be an integer between 1 and 5" });
    }

    const booking = await findBookingByReviewToken(req.params.token);

    if (!booking) {
      return res.status(404).json({ message: "Review link is invalid or expired" });
    }

    if (booking.finalization?.selectedBy?.toString() !== req.user.id) {
      return res.status(403).json({ message: "This review link is not assigned to your account" });
    }

    const reviewingAsGuest = booking.guest._id.toString() === req.user.id;
    const guestReviewed = Boolean(booking.finalization?.guestReviewedAt);

    if (!reviewingAsGuest && !guestReviewed) {
      return res.status(400).json({ message: "Host review is available only after guest review" });
    }

    const revieweeId = reviewingAsGuest ? booking.host._id : booking.guest._id;

    const existingReview = await Review.findOne({ booking: booking._id, reviewer: req.user.id }).lean();
    if (existingReview) {
      return res.status(400).json({ message: "You have already submitted this review" });
    }

    const reviewerAnonymous = reviewingAsGuest ? Boolean(booking.finalization?.anonymous) : false;

    const review = await Review.create({
      booking: booking._id,
      property: booking.property?._id,
      reviewer: req.user.id,
      reviewee: revieweeId,
      rating: normalizedRating,
      comment: (comment || "").trim(),
      anonymous: reviewerAnonymous,
      status: "pending",
    });

    const isAnonymous = reviewerAnonymous;

    booking.finalization.reviewTokenHash = "";
    booking.finalization.reviewTokenExpiresAt = null;

    if (reviewingAsGuest) {
      booking.status = "archived";
      booking.finalization.status = "archived";
      booking.finalization.reviewSubmittedBy = req.user.id;
      booking.finalization.reviewSubmittedAt = new Date();
      booking.finalization.guestReviewedBy = req.user.id;
      booking.finalization.guestReviewedAt = new Date();
      booking.finalization.messagingDisabled = true;

      booking.messages.push({
        text: isAnonymous
          ? "System: Reservation archived."
          : "System: Reservation archived (reviewed).",
        timestamp: new Date(),
        read: false,
        type: "system",
        badge: "success",
        action: isAnonymous ? "archive_set" : "review_submitted",
        anonymous: isAnonymous,
      });
    } else {
      booking.finalization.hostReviewedBy = req.user.id;
      booking.finalization.hostReviewedAt = new Date();

      booking.messages.push({
        text: "System: Follow-up review submitted.",
        timestamp: new Date(),
        read: false,
        type: "system",
        badge: "success",
        action: "review_submitted",
        anonymous: false,
      });
    }

    markUnreadForOtherParty(booking, req.user.id);
    await booking.save();

    return res.status(201).json({ message: "Review submitted and pending admin approval", reviewId: review._id });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).json({ message: "You have already submitted this review" });
    }

    return res.status(500).json({ message: "Failed to submit review", error: error.message });
  }
});

module.exports = router;
