const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema(
  {
    property:   { type: mongoose.Schema.Types.ObjectId, ref: "Property", required: true },
    guest:      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    host:       { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    startDate:  { type: Date, required: true },
    endDate:    { type: Date, required: true },
    totalPrice: { type: Number, required: true },
    status:     { type: String, enum: ["pending", "confirmed", "cancelled", "rejected", "archived"], default: "pending" },
    // Track which specific bed(s) are booked
    bookedBeds: [{
      roomIndex: { type: Number, required: true },
      bedIndex: { type: Number, required: true },
      bedLabel: { type: String, required: true }
    }],
    // Messages between guest and host
    messages: [{
      sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      text: { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
      read: { type: Boolean, default: false },
      type: { type: String, enum: ["user", "system"], default: "user" },
      badge: {
        type: String,
        enum: ["default", "info", "warning", "success", "error", "secondary"],
        default: "default"
      },
      action: {
        type: String,
        enum: ["review_set", "archive_set", "cancel_set", "review_submitted"],
      },
      anonymous: { type: Boolean, default: false }
    }],
    finalization: {
      status: {
        type: String,
        enum: ["none", "review_set", "reviewed", "archived", "cancelled"],
        default: "none"
      },
      selectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      selectedAt: { type: Date },
      anonymous: { type: Boolean, default: false },
      messagingDisabled: { type: Boolean, default: false },
      reviewTokenHash: { type: String, default: "" },
      reviewTokenExpiresAt: { type: Date, default: null },
      reviewSubmittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      reviewSubmittedAt: { type: Date, default: null },
      guestReviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      guestReviewedAt: { type: Date, default: null },
      hostReviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      hostReviewedAt: { type: Date, default: null }
    },
    // Track who has unread messages
    unreadByGuest: { type: Boolean, default: false },
    unreadByHost: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", BookingSchema);
