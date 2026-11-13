
const express = require("express");

const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const {
  getMyPayoutDetails,
  updateMyPayoutDetails,
} = require("../controllers/payoutProfileController");

const router = express.Router();

router.use(protect);
router.use(authorizeRoles("farmer", "deliveryAgent"));

router.get("/me", getMyPayoutDetails);
router.patch("/me", updateMyPayoutDetails);

module.exports = router;
