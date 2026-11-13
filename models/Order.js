
const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    deliveryAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    
deliveryAssignmentHistory: [
  {
    deliveryAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
    outcome: {
      type: String,
      enum: ["assigned", "failed", "reassigned", "delivered"],
      default: "assigned",
    },
  },
],


    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    purchaseRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseRequest",
      required: true,
      unique: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 0.01,
    },

    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },

    deliveryFee: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    // Fixed financial snapshot taken at order creation.
    commissionRate: { type: Number, required: true, default: 1, min: 0, max: 100 },
    commissionAmount: { type: Number, required: true, default: 0, min: 0 },
    farmerEarnings: { type: Number, required: true, default: 0, min: 0 },
    deliveryEarnings: { type: Number, required: true, default: 0, min: 0 },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      enum: ["GMD"],
      default: "GMD",
    },

    deliveryAddress: {
      type: String,
      trim: true,
      default: "",
      maxlength: 300,
    },

    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "processing",
        "ready_for_delivery",
        "completed",
        "cancelled",
      ],
      default: "pending",
    },

    paymentStatus: {
      type: String,
      enum: [
        "unpaid",
        "pending",
        "paid",
        "failed",
        "refunded",
      ],
      default: "unpaid",
    },

    
paymentMethod: {
  type: String,
  enum: ["wave", "aps"],
  default: null,
},

paymentReference: {
  type: String,
  default: null,
  trim: true,
},

paidAt: {
  type: Date,
  default: null,
},


    deliveryStatus: {
      type: String,
      enum: [
        "not_assigned",
        "assigned",
        "picked_up",
        "in_transit",
        "delivered",
        "failed",
      ],
      default: "not_assigned",
    },

    
deliveryTracking: {
  currentLocation: {
    latitude: {
      type: Number,
      min: -90,
      max: 90,
      default: null,
    },

    longitude: {
      type: Number,
      min: -180,
      max: 180,
      default: null,
    },

    accuracy: {
      type: Number,
      min: 0,
      default: null,
    },

    updatedAt: {
      type: Date,
      default: null,
    },
  },
},


    buyerConfirmedDelivery: {
  type: Boolean,
  default: false,
},

buyerConfirmedAt: {
  type: Date,
  default: null,
},
    
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Order", orderSchema);

