const mongoose = require("mongoose");

const PropertySchema = new mongoose.Schema(
  {
    ownerHost: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    type: { type: String, enum: ["accommodation", "private", "bed"], required: true }, // accommodation, private room, bed
    //rooms variable, which is an array of objects
    //length of array is equal to number of rooms
    //each object is either a public room or a private room
    //and each room contains an array of labels reflecting the size of bed in that room, and wether it is available or not
    rooms: [
      {
        isPrivate: { type: Boolean, required: true },
        beds: [
          {
            label: { type: String, required: true }, // e.g. "Queen", "Single", etc.
            isAvailable: { type: Boolean, default: true },
            pricePerBed: { type: Number, required: true }, // Price for this specific bed
          },
        ],
      },
    ],
    description: { type: String, required: true },
    pricePerNight: { type: Number, default: 0 },
    address: { type: String, required: true },
    city: { type: String, required: true },
    country: { type: String, required: true },
    images: [
      {
        path: { type: String, required: true },
        caption: { type: String, default: "" },
      }
    ],
    maxGuests: { type: Number, default: 0 },
    facilities: [String], // e.g. WiFi, Kitchen, etc.
    category: { type: String }, // e.g. "apartment", "condo", etc.
    latitude: { type: Number, required: false },
    longitude: { type: Number, required: false },
    isActive: { type: Boolean, default: false }, // Property is disabled until rooms are configured
    // Host-defined unavailable periods
    blockedPeriods: [
      {
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        reason: { type: String, default: "Unavailable" }, // e.g., "Maintenance", "Holiday", "Personal"
        blockType: { type: String, enum: ["entire", "room", "bed"], required: true },
        // For specific room/bed blocking
        roomIndex: { type: Number }, // Which room (if blockType is "room" or "bed")
        bedIndex: { type: Number }, // Which bed (if blockType is "bed")
        createdAt: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Property", PropertySchema);
