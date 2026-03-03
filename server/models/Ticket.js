const mongoose = require("mongoose");

const TicketSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    userEmail: { type: String, required: true, trim: true },
    userName: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true, maxlength: 180 },
    message: { type: String, required: true, trim: true, maxlength: 4000 },
    source: { type: String, default: "support", trim: true, maxlength: 64 },
    contextSlug: { type: String, default: "", trim: true, maxlength: 120 },
    contextTitle: { type: String, default: "", trim: true, maxlength: 180 },
    status: {
      type: String,
      enum: ["open", "in-review", "resolved", "closed"],
      default: "open",
      index: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Ticket", TicketSchema);
