const express = require("express");
const verifyToken = require("../middleware/auth");
const Ticket = require("../models/Ticket");
const User = require("../models/User");
const emailService = require("../utils/emailService");

const router = express.Router();

router.post("/", verifyToken, async (req, res) => {
  try {
    const { subject, message, source, contextSlug, contextTitle } = req.body;

    if (!subject || typeof subject !== "string" || !subject.trim()) {
      return res.status(400).json({ message: "Subject is required" });
    }

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ message: "Message is required" });
    }

    const user = await User.findById(req.user.id).select("firstName lastName email").lean();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const userName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || "User";

    const ticket = await Ticket.create({
      user: req.user.id,
      userEmail: user.email,
      userName,
      subject: subject.trim(),
      message: message.trim(),
      source: typeof source === "string" ? source.trim() : "support",
      contextSlug: typeof contextSlug === "string" ? contextSlug.trim() : "",
      contextTitle: typeof contextTitle === "string" ? contextTitle.trim() : "",
      status: "open"
    });

    const referenceId = ticket._id.toString().slice(-8).toUpperCase();

    emailService.send({
      to: user.email,
      subject: `Support ticket received: ${ticket.subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1976d2;">We received your support request</h1>
          <p>Hi ${user.firstName || "there"},</p>
          <p>Your request has been submitted successfully. Our team will review it and follow up as soon as possible.</p>
          <div style="background-color: #f5f5f5; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 8px;"><strong>Ticket:</strong> #${referenceId}</p>
            <p style="margin: 0 0 8px;"><strong>Subject:</strong> ${ticket.subject}</p>
            <p style="margin: 0;"><strong>Status:</strong> Open</p>
          </div>
          <p style="color: #666;">If you need to add more details, create a new support ticket from the same support topic.</p>
        </div>
      `
    }).catch((err) => {
      console.error("Failed to send support ticket confirmation email:", err.message);
    });

    res.status(201).json({
      message: "Support ticket submitted successfully. A confirmation email has been sent.",
      ticket: {
        id: ticket._id,
        subject: ticket.subject,
        status: ticket.status,
        createdAt: ticket.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to submit support ticket", error: error.message });
  }
});

module.exports = router;
