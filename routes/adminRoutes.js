
const express = require("express");

const {
  getAllUsers,
  updateUserStatus,
  getAllOrders,
} = require("../controllers/adminController");


const {
  getAllCategoriesAdmin,
} = require("../controllers/categoryController");


const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

// All admin routes require authentication and admin privileges
router.use(protect);
router.use(authorizeRoles("admin"));


// Get all registered users
router.get("/users", getAllUsers);

router.get("/orders", getAllOrders);


// Get all categories (admin view)
router.get("/categories", getAllCategoriesAdmin);

// Update a user's account status
router.patch("/users/:userId/status", updateUserStatus);

module.exports = router;
