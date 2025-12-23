const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName:  { type: String, required: true },
    phone:     { type: String },
    email:     { type: String, required: true, unique: true },
    password:  { type: String, required: true },
    profileImagePath: { type: String, default: "" },

    // Lists for guest and host features
    tripList:       { type: [mongoose.Schema.Types.ObjectId], ref: "Booking", default: [] },
    wishList:       { type: [mongoose.Schema.Types.ObjectId], ref: "Property", default: [] },
    propertyList:   { type: [mongoose.Schema.Types.ObjectId], ref: "Property", default: [] },
    reservationList:{ type: [mongoose.Schema.Types.ObjectId], ref: "Booking", default: [] },
    // wishList:       [{ type: mongoose.Schema.Types.ObjectId, ref: "Property" }],

    
    role: { type: String, enum: ["guest", "host"], default: "guest" },
    hasPaid: { type: Boolean, default: false } // Flag for hosts who have paid
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
