const mongoose = require("mongoose");
const Product = require("../models/Product");
const createNotification = require("../utils/createNotification");
const createAuditLog = require("../utils/createAuditLog");

const getAdminProducts = async (req, res) => {
  try {
    const products = await Product.find()
      .populate("farmer", "name email phone")
      .populate("category", "name")
      .populate("moderation.reviewedBy", "name")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      count: products.length,
      products,
    });
  } catch (error) {
    console.error("Admin products error:", error);
    return res.status(500).json({
      message: "Failed to load products",
    });
  }
};

const moderateProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const { action, reason } = req.body;

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    if (!["remove", "restore"].includes(action)) {
      return res.status(400).json({
        message: "Action must be remove or restore",
      });
    }

    if (
      action === "remove" &&
      (typeof reason !== "string" ||
        !reason.trim() ||
        reason.trim().length > 500)
    ) {
      return res.status(400).json({
        message: "Provide a reason of up to 500 characters",
      });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    const currentlyRemoved = product.moderation?.status === "removed";

    if (
      (action === "remove" && currentlyRemoved) ||
      (action === "restore" && !currentlyRemoved)
    ) {
      return res.status(409).json({
        message: "Product is already in the requested moderation state",
      });
    }

    product.moderation = {
      status: action === "remove" ? "removed" : "approved",
      reason: action === "remove" ? reason.trim() : "",
      reviewedBy: req.user.id,
      reviewedAt: new Date(),
    };

    await product.save();

    await createAuditLog({
      admin: req.user.id,
      action: action === "remove" ? "PRODUCT_REMOVED" : "PRODUCT_RESTORED",
      targetType: "Product",
      targetId: product._id,
      details: {
        productName: product.name,
        farmerId: product.farmer,
        previousModerationStatus: currentlyRemoved ? "removed" : "approved",
        newModerationStatus: action === "remove" ? "removed" : "approved",
        reason: action === "remove" ? reason.trim() : "",
      },
      ipAddress: req.ip,
    });

    await createNotification({
      recipient: product.farmer,
      type: action === "remove" ? "product_removed" : "product_restored",
      title:
        action === "remove"
          ? "Product listing removed"
          : "Product listing restored",
      message:
        action === "remove"
          ? `Your listing "${product.name}" was removed by an administrator. Reason: ${reason.trim()}`
          : `Your listing "${product.name}" has been restored by an administrator.`,
      link: "/farmer/products",
    });

    return res.json({
      message:
        action === "remove"
          ? "Product removed from marketplace"
          : "Product moderation restriction lifted",
      product,
    });
  } catch (error) {
    console.error("Moderate product error:", error);

    return res.status(500).json({
      message: "Failed to moderate product",
    });
  }
};

module.exports = {
  getAdminProducts,
  moderateProduct,
};
