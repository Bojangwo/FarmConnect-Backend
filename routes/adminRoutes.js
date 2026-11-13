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

const { getSettings, updateSettings, getFinancialSummary, preparePayouts, markPayoutPaid,verifyPayoutDetails, getPayoutAccounts } = require("../controllers/adminPaymentController");
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

router.get("/payment-settings", getSettings);
router.patch("/payment-settings", updateSettings);
router.get("/finances", getFinancialSummary);
router.post("/orders/:orderId/prepare-payouts", preparePayouts);
router.patch("/payouts/:payoutId/mark-paid", markPayoutPaid);
router.patch(
  "/users/:userId/verify-payout",
  verifyPayoutDetails
);
router.get("/payout-accounts", getPayoutAccounts);

module.exports = router;

