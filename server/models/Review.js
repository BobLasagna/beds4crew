const mongoose = require("mongoose");

const ReviewSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    property: { type: mongoose.Schema.Types.ObjectId, ref: "Property", required: true },
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reviewee: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, trim: true, maxlength: 1200, default: "" },
    anonymous: { type: Boolean, default: false },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
    moderation: {
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      reviewedAt: { type: Date, default: null },
      notes: { type: String, default: "" },
    },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

ReviewSchema.index({ booking: 1, reviewer: 1 }, { unique: true });

module.exports = mongoose.model("Review", ReviewSchema);
