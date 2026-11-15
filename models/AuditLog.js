
const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
    },

    action: {
      type: String,
      required: true,
      immutable: true,
      enum: [
        "USER_STATUS_CHANGED",
        "PRODUCT_REMOVED",
        "PRODUCT_RESTORED",
        "PAYMENT_SETTINGS_UPDATED",
        "PAYOUT_RECORDED",
        "PAYOUT_DETAILS_VERIFIED",
      ],
    },

    targetType: {
      type: String,
      required: true,
      immutable: true,
      enum: ["User", "Product", "PaymentSettings", "Payout"],
    },

    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      immutable: true,
    },

    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      immutable: true,
    },

    ipAddress: {
      type: String,
      default: "",
      immutable: true,
    },
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: false,
    },
    versionKey: false,
  }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ admin: 1, createdAt: -1 });
auditLogSchema.index({ targetType: 1, targetId: 1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
