
const express = require("express");

const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const {
  getMyEarnings,
} = require("../controllers/earningsController");

const router = express.Router();

router.use(protect);
router.use(authorizeRoles("farmer", "deliveryAgent"));

router.get("/me", getMyEarnings);

module.exports = router;
