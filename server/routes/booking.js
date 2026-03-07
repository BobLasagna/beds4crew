const express = require("express");
const crypto = require("crypto");
const Booking = require("../models/Booking");
const Property = require("../models/Property");
const User = require("../models/User");
const verifyToken = require("../middleware/auth");
const { validateDateRange } = require("../utils/validation");
const emailService = require("../utils/emailService");

const router = express.Router();

const parsePagination = (req) => {
  const hasPagination = req.query.page !== undefined || req.query.limit !== undefined;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  return { hasPagination, page, limit, skip: (page - 1) * limit };
};

const formatDateForMessage = (value) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value || "");

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
};

const buildInitialBookingMessage = ({ bookedBeds, startDate, endDate }) => {
  const startLabel = formatDateForMessage(startDate);
  const endLabel = formatDateForMessage(endDate);
  const hasBeds = Array.isArray(bookedBeds) && bookedBeds.length > 0;

  if (!hasBeds) {
    return `I would like to book this property from ${startLabel} to ${endLabel}.`;
  }

  const labels = bookedBeds
    .map((bed) => bed?.bedLabel)
    .filter(Boolean);

  if (labels.length === 1) {
    return `I would like to book your${labels[0]} from ${startLabel} to ${endLabel}.`;
  }

  return `I would like to book these beds from ${startLabel} to ${endLabel}.`;
};

const markUnreadForOtherParty = (booking, actorId) => {
  if (booking.guest.toString() === actorId) {
    booking.unreadByHost = true;
    booking.unreadByGuest = false;
  } else {
    booking.unreadByGuest = true;
    booking.unreadByHost = false;
  }
};

const pushSystemMessage = (booking, { text, action, badge = "info", anonymous = false }) => {
  booking.messages.push({
    text,
    timestamp: new Date(),
    read: false,
    type: "system",
    badge,
    action,
    anonymous,
  });
};

const startReviewFlow = async ({ booking, userId, anonymous }) => {
  const isGuest = booking.guest.toString() === userId || booking.guest?._id?.toString() === userId;
  const isHost = booking.host.toString() === userId || booking.host?._id?.toString() === userId;

  if (!isGuest && !isHost) {
    return { error: { status: 403, message: "Unauthorized" } };
  }

  const guestReviewed = Boolean(booking.finalization?.guestReviewedAt);
  const hostReviewed = Boolean(booking.finalization?.hostReviewedAt);

  if (isGuest) {
    if (booking.status !== "confirmed") {
      return { error: { status: 400, message: "Guest review can only start on confirmed bookings" } };
    }
    if (guestReviewed) {
      return { error: { status: 400, message: "Guest review has already been submitted" } };
    }
  }

  if (isHost) {
    if (!guestReviewed) {
      return { error: { status: 400, message: "Host review is available only after guest review" } };
    }
    if (hostReviewed) {
      return { error: { status: 400, message: "Host review has already been submitted" } };
    }
  }

  const reviewToken = crypto.randomBytes(32).toString("hex");
  const reviewTokenHash = crypto.createHash("sha256").update(reviewToken).digest("hex");
  const reviewTokenExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
  const isAnonymous = isGuest ? Boolean(anonymous) : false;

  booking.finalization = {
    ...(booking.finalization || {}),
    status: isGuest ? "review_set" : booking.finalization?.status || "archived",
    selectedBy: userId,
    selectedAt: new Date(),
    anonymous: isGuest ? isAnonymous : Boolean(booking.finalization?.anonymous),
    reviewTokenHash,
    reviewTokenExpiresAt,
  };

  if (isGuest && !isAnonymous) {
    pushSystemMessage(booking, {
      text: "System: Reservation review set.",
      action: "review_set",
      badge: "secondary",
      anonymous: false,
    });

    markUnreadForOtherParty(booking, userId);
  }

  await booking.save();

  return {
    reviewToken,
    reviewUrl: `/review/${reviewToken}`,
    booking,
    message: "Review flow started",
  };
};

// Create a new booking (guest only) - starts as "pending"
router.post("/", verifyToken, async (req, res) => {
  try {
    const { propertyId, startDate, endDate, bookedBeds, totalPrice } = req.body;
    
    // Validate date range
    const dateValidation = validateDateRange(startDate, endDate);
    if (!dateValidation.valid) {
      return res.status(400).json({ message: dateValidation.message });
    }
    
    const property = await Property.findById(propertyId).populate("ownerHost", "hasPaid").lean();
    if (!property) return res.status(404).json({ message: "Property not found" });
    
    // Check if host has paid
    if (!property.ownerHost?.hasPaid) {
      return res.status(403).json({ message: "This property is not available for booking. Need help? Contact support." });
    }

    // Calculate nights
    const start = new Date(startDate).setHours(0,0,0,0);
    const end = new Date(endDate).setHours(0,0,0,0);
    const nights = Math.floor((end - start) / (1000 * 60 * 60 * 24));
    
    // Use totalPrice from request (already calculated by BedSelector)
    // If not provided, calculate it as fallback
    let finalPrice = totalPrice;
    if (!finalPrice) {
      if (bookedBeds && bookedBeds.length > 0) {
        finalPrice = bookedBeds.reduce((sum, bed) => {
          const room = property.rooms[bed.roomIndex];
          const bedData = room?.beds[bed.bedIndex];
          return sum + (bedData?.pricePerBed || 0);
        }, 0) * nights;
      } else {
        finalPrice = nights * property.pricePerNight;
      }
    }

    // Check if specific beds are already booked (only confirmed, not pending)
    if (bookedBeds && bookedBeds.length > 0) {
      const overlapping = await Booking.findOne({
        property: propertyId,
        status: "confirmed",
        startDate: { $lte: endDate },
        endDate: { $gte: startDate },
        bookedBeds: {
          $elemMatch: {
            roomIndex: { $in: bookedBeds.map(b => b.roomIndex) },
            bedIndex: { $in: bookedBeds.map(b => b.bedIndex) }
          }
        }
      }).lean();
      
      if (overlapping) {
        return res.status(409).json({ message: "One or more beds already booked for those dates" });
      }
    } else {
      // Prevent double booking for entire property (only confirmed, not pending)
      const overlapping = await Booking.findOne({
        property: propertyId,
        status: "confirmed",
        $or: [
          { startDate: { $lte: endDate }, endDate: { $gte: startDate } }
        ]
      }).lean();
      
      if (overlapping) {
        return res.status(409).json({ message: "Property already booked for those dates" });
      }
    }

    // Create booking with pending status
    const initialMessageText = buildInitialBookingMessage({
      bookedBeds,
      startDate,
      endDate,
    });

    const booking = new Booking({
      property: propertyId,
      guest: req.user.id,
      host: property.ownerHost,
      startDate, 
      endDate, 
      totalPrice: finalPrice,
      status: "pending",
      bookedBeds: bookedBeds || [],
      messages: [
        {
          sender: req.user.id,
          text: initialMessageText,
          timestamp: new Date(),
          read: false,
          type: "user",
        },
      ],
      unreadByHost: true,
      unreadByGuest: false,
    });
    await booking.save();
    
    // Send email notifications (non-blocking)
    Promise.all([
      // Notify guest about pending booking
      User.findById(req.user.id).then(guest => {
        if (guest?.email && guest.emailPreferences?.bookingConfirmation !== false) {
          return emailService.sendBookingConfirmation(
            guest.email,
            guest.firstName,
            property.title,
            startDate,
            endDate,
            finalPrice,
            booking._id
          );
        }
      }),
      // Notify host about new booking request
      User.findById(property.ownerHost).then(host => {
        if (host?.email && host.emailPreferences?.newBookingRequest !== false) {
          return User.findById(req.user.id).then(guest => {
            if (guest) {
              return emailService.sendNewBookingNotification(
                host.email,
                host.firstName,
                `${guest.firstName} ${guest.lastName}`,
                property.title,
                startDate,
                endDate,
                finalPrice,
                booking._id
              );
            }
          });
        }
      })
    ]).catch(err => console.error('Failed to send booking emails:', err));
    
    res.status(201).json(booking);
  } catch (error) {
    res.status(500).json({ message: "Booking failed", error: error.message });
  }
});

// Get all bookings for the user (guest's trip list)
router.get("/guest", verifyToken, async (req, res) => {
  try {
    const { hasPagination, page, limit, skip } = parsePagination(req);
    const query = Booking.find({ guest: req.user.id })
      .populate("property", "title city country images status")
      .populate("host", "firstName lastName email profileImagePath")
      .sort("-createdAt")
      .lean();

    if (!hasPagination) {
      const bookings = await query;
      return res.json(bookings);
    }

    const [bookings, total] = await Promise.all([
      query.skip(skip).limit(limit),
      Booking.countDocuments({ guest: req.user.id }),
    ]);

    return res.json({
      items: bookings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch bookings", error: error.message });
  }
});

// Get all bookings for host's properties (host-only)
router.get("/host", verifyToken, async (req, res) => {
  try {
    const { hasPagination, page, limit, skip } = parsePagination(req);
    const query = Booking.find({ host: req.user.id })
      .populate("property", "title city country images status")
      .populate("guest", "firstName lastName email profileImagePath")
      .sort("-createdAt")
      .lean();

    if (!hasPagination) {
      const bookings = await query;
      return res.json(bookings);
    }

    const [bookings, total] = await Promise.all([
      query.skip(skip).limit(limit),
      Booking.countDocuments({ host: req.user.id }),
    ]);

    return res.json({
      items: bookings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch bookings", error: error.message });
  }
});

// Get all bookings for a specific property (public - for calendar display)
router.get("/property/:propertyId", async (req, res) => {
  try {
    const bookings = await Booking.find({ 
      property: req.params.propertyId,
      status: { $in: ["confirmed", "pending"] }
    })
      .select("startDate endDate status bookedBeds")
      .lean();
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch property bookings", error: error.message });
  }
});

// Host confirms a booking
router.put("/:id/confirm", verifyToken, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate("property");
    
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    
    // Only host can confirm
    if (booking.host.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized - only host can confirm" });
    }
    
    if (booking.status !== "pending") {
      return res.status(400).json({ message: "Can only confirm pending bookings" });
    }
    
    // Check for conflicts with other confirmed bookings before confirming
    if (booking.bookedBeds && booking.bookedBeds.length > 0) {
      // Check if specific beds are already booked
      const conflictingBooking = await Booking.findOne({
        _id: { $ne: booking._id }, // Exclude current booking
        property: booking.property._id,
        status: "confirmed",
        startDate: { $lte: booking.endDate },
        endDate: { $gte: booking.startDate },
        bookedBeds: {
          $elemMatch: {
            $or: booking.bookedBeds.map(bed => ({
              roomIndex: bed.roomIndex,
              bedIndex: bed.bedIndex
            }))
          }
        }
      }).lean();
      
      if (conflictingBooking) {
        return res.status(409).json({ 
          message: "Cannot confirm: One or more beds are already booked for overlapping dates" 
        });
      }
    } else {
      // Check for conflicts when booking entire property
      const conflictingBooking = await Booking.findOne({
        _id: { $ne: booking._id }, // Exclude current booking
        property: booking.property._id,
        status: "confirmed",
        startDate: { $lte: booking.endDate },
        endDate: { $gte: booking.startDate }
      }).lean();
      
      if (conflictingBooking) {
        return res.status(409).json({ 
          message: "Cannot confirm: Property is already booked for overlapping dates" 
        });
      }
    }
    
    booking.status = "confirmed";
    booking.messages.push({
      sender: req.user.id,
      text: "Confirmed",
      timestamp: new Date(),
      read: false,
      type: "user",
    });
    booking.unreadByGuest = true;
    booking.unreadByHost = false;
    await booking.save();
    
    // Populate booking with guest info for email
    await booking.populate("guest property");
    
    // Send confirmation email to guest if preference is enabled (non-blocking)
    if (booking.guest?.email && booking.guest.emailPreferences?.bookingConfirmation !== false) {
      emailService.sendBookingConfirmation(
        booking.guest.email,
        booking.guest.firstName,
        booking.property.title,
        booking.startDate,
        booking.endDate,
        booking.totalPrice,
        booking._id
      ).catch(err => console.error('Failed to send confirmation email:', err));
    }
    
    res.json({ message: "Booking confirmed successfully", booking });
  } catch (error) {
    res.status(500).json({ message: "Failed to confirm booking", error: error.message });
  }
});

// Host rejects a booking
router.put("/:id/reject", verifyToken, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    
    // Only host can reject
    if (booking.host.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized - only host can reject" });
    }
    
    if (booking.status !== "pending") {
      return res.status(400).json({ message: "Can only reject pending bookings" });
    }
    
    booking.status = "rejected";
    await booking.save();
    
    res.json({ message: "Booking rejected", booking });
  } catch (error) {
    res.status(500).json({ message: "Failed to reject booking", error: error.message });
  }
});

// Cancel a booking (guest can cancel)
router.put("/:id/cancel", verifyToken, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate("property");
    
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    
    // Only guest who made the booking can cancel it
    if (booking.guest.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (booking.status === "confirmed") {
      return res.status(400).json({
        message: "Confirmed bookings require finalization. Use finalize and choose Review, Archive, or Cancel."
      });
    }

    if (booking.status === "cancelled" || booking.status === "rejected" || booking.status === "archived") {
      return res.status(400).json({ message: "Booking is already closed" });
    }
    
    booking.status = "cancelled";
    await booking.save();
    
    // Populate booking with guest and host info for emails
    await booking.populate("guest host");
    
    // Send cancellation emails to both guest and host if preference is enabled (non-blocking)
    Promise.all([
      booking.guest?.email && booking.guest.emailPreferences?.bookingCancellation !== false ? emailService.sendBookingCancellation(
        booking.guest.email,
        booking.guest.firstName,
        booking.property.title,
        booking.startDate,
        booking.endDate,
        booking._id
      ) : Promise.resolve(),
      booking.host?.email && booking.host.emailPreferences?.bookingCancellation !== false ? emailService.sendBookingCancellation(
        booking.host.email,
        booking.host.firstName,
        booking.property.title,
        booking.startDate,
        booking.endDate,
        booking._id
      ) : Promise.resolve()
    ]).catch(err => console.error('Failed to send cancellation emails:', err));
    
    res.json({ message: "Booking cancelled successfully", booking });
  } catch (error) {
    res.status(500).json({ message: "Failed to cancel booking", error: error.message });
  }
});

// Start review flow (guest first; host only after guest review)
router.put("/:id/review/start", verifyToken, async (req, res) => {
  try {
    const { anonymous } = req.body || {};

    const booking = await Booking.findById(req.params.id)
      .populate("property")
      .populate("guest host", "firstName email emailPreferences");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const result = await startReviewFlow({ booking, userId: req.user.id, anonymous });

    if (result.error) {
      return res.status(result.error.status).json({ message: result.error.message });
    }

    return res.json(result);
  } catch (error) {
    return res.status(500).json({ message: "Failed to start review", error: error.message });
  }
});

// Backward-compatible finalize endpoint: now only supports review
router.put("/:id/finalize", verifyToken, async (req, res) => {
  try {
    const { action, anonymous } = req.body || {};
    if (String(action || "").toLowerCase() !== "review") {
      return res.status(400).json({ message: "Only review is supported" });
    }

    const booking = await Booking.findById(req.params.id)
      .populate("property")
      .populate("guest host", "firstName email emailPreferences");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const result = await startReviewFlow({ booking, userId: req.user.id, anonymous });

    if (result.error) {
      return res.status(result.error.status).json({ message: result.error.message });
    }

    return res.json(result);
  } catch (error) {
    return res.status(500).json({ message: "Failed to start review", error: error.message });
  }
});

// Add a message to a booking
router.post("/:id/message", verifyToken, async (req, res) => {
  try {
    const { text } = req.body;
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    
    // Only guest or host can message
    if (booking.guest.toString() !== req.user.id && booking.host.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    
    // Prevent messaging on closed/finalized bookings
    if (booking.status === "rejected" || booking.status === "cancelled" || booking.status === "archived") {
      return res.status(400).json({ message: "Cannot send messages on closed bookings" });
    }

    if (booking.finalization?.messagingDisabled) {
      return res.status(400).json({ message: "Messaging is disabled after finalization" });
    }
    
    if (!text || text.trim() === "") {
      return res.status(400).json({ message: "Message text is required" });
    }
    
    booking.messages.push({
      sender: req.user.id,
      text: text.trim(),
      timestamp: new Date(),
      read: false
    });
    
    // Mark as unread for the recipient
    if (booking.guest.toString() === req.user.id) {
      booking.unreadByHost = true;
    } else {
      booking.unreadByGuest = true;
    }
    
    await booking.save();
    
    // Populate the sender info for the response
    await booking.populate("messages.sender", "firstName lastName email profileImagePath");
    
    res.json({ message: "Message sent", booking });
  } catch (error) {
    res.status(500).json({ message: "Failed to send message", error: error.message });
  }
});

// Get a single booking with messages
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("property guest host")
      .populate("messages.sender", "firstName lastName email profileImagePath");
    
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    
    // Only guest or host can view
    if (booking.guest._id.toString() !== req.user.id && booking.host._id.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    
    // Mark messages as read for the current user
    if (booking.guest._id.toString() === req.user.id) {
      booking.unreadByGuest = false;
    } else {
      booking.unreadByHost = false;
    }
    
    await booking.save();
    
    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch booking", error: error.message });
  }
});

// Get count of unread messages for current user
router.get("/unread/count", verifyToken, async (req, res) => {
  try {
    const user = JSON.parse(JSON.stringify(req.user)); // Get user info
    let unreadCount = 0;
    
    // Check if user is guest or host and count accordingly
    const asGuest = await Booking.countDocuments({ 
      guest: req.user.id, 
      unreadByGuest: true 
    });
    
    const asHost = await Booking.countDocuments({ 
      host: req.user.id, 
      unreadByHost: true 
    });
    
    unreadCount = asGuest + asHost;
    
    res.json({ unreadCount });
  } catch (error) {
    res.status(500).json({ message: "Failed to get unread count", error: error.message });
  }
});

// Mark booking as read by current user
router.put("/:id/mark-read", verifyToken, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    
    // Only guest or host can mark as read
    if (booking.guest.toString() !== req.user.id && booking.host.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    
    // Mark as read for the current user
    if (booking.guest.toString() === req.user.id) {
      booking.unreadByGuest = false;
    } else if (booking.host.toString() === req.user.id) {
      booking.unreadByHost = false;
    }
    
    await booking.save();
    
    res.json({ message: "Marked as read", booking });
  } catch (error) {
    res.status(500).json({ message: "Failed to mark as read", error: error.message });
  }
});

module.exports = router;
