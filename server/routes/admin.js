const express = require("express");
const User = require("../models/User");
const Property = require("../models/Property");
const Booking = require("../models/Booking");
const Ticket = require("../models/Ticket");
const verifyToken = require("../middleware/auth");
const { verifyAdmin } = require("../middleware/auth");
const router = express.Router();

const parsePagination = (req) => {
  const hasPagination = req.query.page !== undefined || req.query.limit !== undefined;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 1), 100);
  return { hasPagination, page, limit, skip: (page - 1) * limit };
};

// Get all users
router.get("/users", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { hasPagination, page, limit, skip } = parsePagination(req);
    const query = User.find({})
      .select("firstName lastName email role hasPaid isActive stripeCurrentTier listingLimit subscriptionStatus stripeSubscriptionId createdAt")
      .sort({ createdAt: -1 })
      .lean();

    if (!hasPagination) {
      const users = await query;
      return res.json(users);
    }

    const [users, total] = await Promise.all([
      query.skip(skip).limit(limit),
      User.countDocuments({}),
    ]);

    return res.json({
      items: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch users", error: error.message });
  }
});

// Update user (including subscription details)
router.put("/users/:userId", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { 
      firstName, 
      lastName, 
      role, 
      hasPaid,
      isActive,
      stripeCurrentTier,
      listingLimit,
      subscriptionStatus,
      stripeSubscriptionId
    } = req.body;
    
    const updateData = { firstName, lastName, role, hasPaid };
    
    // Allow admin to set account active status
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);
    
    // Allow admin to manually set subscription details
    if (stripeCurrentTier !== undefined) updateData.stripeCurrentTier = parseInt(stripeCurrentTier);
    if (listingLimit !== undefined) updateData.listingLimit = parseInt(listingLimit);
    if (subscriptionStatus !== undefined) updateData.subscriptionStatus = subscriptionStatus;
    if (stripeSubscriptionId !== undefined) updateData.stripeSubscriptionId = stripeSubscriptionId;
    
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      updateData,
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Failed to update user", error: error.message });
  }
});

// Delete user
router.delete("/users/:userId", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete user", error: error.message });
  }
});

// Get all properties (admin view)
router.get("/properties", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { hasPagination, page, limit, skip } = parsePagination(req);
    const query = Property.find({})
      .select("title description pricePerNight maxGuests category status city country ownerHost createdAt")
      .populate("ownerHost", "firstName lastName email hasPaid")
      .sort({ createdAt: -1 })
      .lean();

    if (!hasPagination) {
      const properties = await query;
      return res.json(properties);
    }

    const [properties, total] = await Promise.all([
      query.skip(skip).limit(limit),
      Property.countDocuments({}),
    ]);

    return res.json({
      items: properties,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch properties", error: error.message });
  }
});

// Update property (admin)
router.put("/properties/:propertyId", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { title, description, pricePerNight, maxGuests, category, status } = req.body;
    const updateData = { title, description, pricePerNight, maxGuests, category };

    if (status !== undefined) {
      updateData.status = status;
    }

    const property = await Property.findByIdAndUpdate(
      req.params.propertyId,
      updateData,
      { new: true }
    ).populate("ownerHost", "firstName lastName email");

    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    res.json(property);
  } catch (error) {
    res.status(500).json({ message: "Failed to update property", error: error.message });
  }
});

// Delete property (admin)
router.delete("/properties/:propertyId", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const property = await Property.findByIdAndDelete(req.params.propertyId);
    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    res.json({ message: "Property deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete property", error: error.message });
  }
});

// Get all bookings (admin view)
router.get("/bookings", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { hasPagination, page, limit, skip } = parsePagination(req);
    const query = Booking.find({})
      .select("property guest host startDate endDate totalPrice status unreadByGuest unreadByHost createdAt")
      .populate("guest", "firstName lastName email")
      .populate("host", "firstName lastName email")
      .populate("property", "title city country")
      .sort({ createdAt: -1 })
      .lean();

    if (!hasPagination) {
      const bookings = await query;
      return res.json(bookings);
    }

    const [bookings, total] = await Promise.all([
      query.skip(skip).limit(limit),
      Booking.countDocuments({}),
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

// Update booking status (admin)
router.put("/bookings/:bookingId", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findByIdAndUpdate(
      req.params.bookingId,
      { status },
      { new: true }
    )
      .populate("guest", "firstName lastName email")
      .populate("host", "firstName lastName email")
      .populate("property", "title city country");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: "Failed to update booking", error: error.message });
  }
});

// Delete booking (admin)
router.delete("/bookings/:bookingId", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    res.json({ message: "Booking deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete booking", error: error.message });
  }
});

// Fix all beds with missing or false isAvailable (migration endpoint)
router.post("/fix-beds", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const properties = await Property.find({});
    let updatedCount = 0;
    let bedsFixed = 0;
    
    for (const property of properties) {
      let needsUpdate = false;
      
      property.rooms.forEach(room => {
        room.beds.forEach(bed => {
          // Fix beds that are undefined, null, or explicitly false
          if (bed.isAvailable !== true) {
            bed.isAvailable = true;
            needsUpdate = true;
            bedsFixed++;
          }
        });
      });
      
      if (needsUpdate) {
        await property.save();
        updatedCount++;
      }
    }
    
    res.json({ 
      message: "Bed availability fixed", 
      propertiesUpdated: updatedCount,
      bedsFixed: bedsFixed
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fix beds", error: error.message });
  }
});

// Get support tickets (paginated, newest first)
router.get("/tickets", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const [tickets, total] = await Promise.all([
      Ticket.find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Ticket.countDocuments({})
    ]);

    res.json({
      items: tickets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch tickets", error: error.message });
  }
});

// Bulk delete support tickets
router.delete("/tickets", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { ids } = req.body || {};

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "Ticket ids are required" });
    }

    const deleteResult = await Ticket.deleteMany({ _id: { $in: ids } });
    res.json({ message: "Tickets deleted successfully", deletedCount: deleteResult.deletedCount || 0 });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete tickets", error: error.message });
  }
});

module.exports = router;
