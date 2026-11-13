
const mongoose = require("mongoose");

const payoutSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },

    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    recipientType: {
      type: String,
      enum: ["farmer", "deliveryAgent"],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      enum: ["GMD"],
      default: "GMD",
    },

    status: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending",
    },

    payoutDestination: {
      provider: {
        type: String,
        enum: ["wave", "aps"],
      },
      phoneNumber: {
        type: String,
        trim: true,
      },
      accountHolderName: {
        type: String,
        trim: true,
      },
    },

    transactionReference: {
      type: String,
      trim: true,
      default: null,
    },

    paidAt: {
      type: Date,
      default: null,
    },

    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

// Prevent duplicate payouts for the same recipient type/order.
payoutSchema.index(
  { order: 1, recipientType: 1 },
  { unique: true }
);

module.exports = mongoose.model("Payout", payoutSchema);
