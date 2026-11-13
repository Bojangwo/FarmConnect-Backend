const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  key: { type: String, default: "default", unique: true, immutable: true },
  commissionRate: { type: Number, default: 1, min: 0, max: 100, required: true },
  deliveryFee: { type: Number, default: 0, min: 0, required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
}, { timestamps: true });
module.exports = mongoose.model("PaymentSettings", schema);
