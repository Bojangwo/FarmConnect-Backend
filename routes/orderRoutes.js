
const express = require("express");

const {
  getMyOrders,
  getMyDeliveries,
  getBuyerDeliveryLocation,
  getOrderById,
  updateOrderStatus,
  assignDeliveryAgent,
  updateDeliveryStatus,
  updateDeliveryLocation,
  getDeliveryHistory,
  confirmDelivery,
} = require("../controllers/orderController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

// View the logged-in user's orders
router.get("/", protect, getMyOrders);

router.get(
  "/my-deliveries",
  protect,
  require("../middleware/roleMiddleware")("deliveryAgent"),
  getMyDeliveries
);

router.patch(
  "/:orderId/delivery-status",
  protect,
  require("../middleware/roleMiddleware")("deliveryAgent"),
  updateDeliveryStatus
);


router.patch(
  "/:orderId/delivery-location",
  protect,
  require("../middleware/roleMiddleware")("deliveryAgent"),
  updateDeliveryLocation
);

router.get(
  "/:orderId/delivery-location",
  protect,
  require("../middleware/roleMiddleware")("buyer"),
  getBuyerDeliveryLocation
);

router.patch(
  "/:orderId/status",
  protect,
  require("../middleware/roleMiddleware")("farmer"),
  updateOrderStatus
);

router.patch(
  "/:orderId/assign-delivery",
  protect,
  require("../middleware/roleMiddleware")("admin"),
  assignDeliveryAgent
);

// Admin views an order's delivery assignment history
router.get(
  "/:orderId/delivery-history",
  protect,
  require("../middleware/roleMiddleware")("admin"),
  getDeliveryHistory
);

// View one order's details
router.get("/:orderId", protect, getOrderById);

router.patch(
  "/:orderId/confirm-delivery",
  protect,
  require("../middleware/roleMiddleware")("buyer"),
  confirmDelivery
);

module.exports = router;