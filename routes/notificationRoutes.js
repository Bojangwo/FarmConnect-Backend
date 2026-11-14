
const express = require("express");
const router = express.Router();

// Import protect directly (no curly braces)
const protect = require("../middleware/authMiddleware");

const {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
} = require("../controllers/notificationController");

// Protect all notification routes
router.use(protect);

// Get logged-in user's notifications
router.get("/", getMyNotifications);

// Mark all notifications as read
router.patch("/read-all", markAllAsRead);

// Mark one notification as read
router.patch("/:id/read", markAsRead);

module.exports = router;
