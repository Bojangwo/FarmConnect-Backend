const mongoose = require("mongoose");
const PaymentSettings = require("../models/PaymentSettings");
const Order = require("../models/Order");
const Payout = require("../models/Payout");
const User = require("../models/User");

const getSettings = async (_req, res) => {
  try {
    const settings = await PaymentSettings.findOne({ key: "default" }).lean();
    return res.json({ settings: settings || { commissionRate: 1, deliveryFee: 0 } });
  } catch (e) { return res.status(500).json({ message: "Could not load payment settings" }); }
};

const updateSettings = async (req, res) => {
  try {
    const { commissionRate, deliveryFee } = req.body;
    if (typeof commissionRate !== "number" || !Number.isFinite(commissionRate) ||
        commissionRate < 0 || commissionRate > 100 ||
        typeof deliveryFee !== "number" || !Number.isFinite(deliveryFee) ||
        deliveryFee < 0 || Math.round(deliveryFee * 100) !== deliveryFee * 100) {
      return res.status(400).json({ message: "Provide numeric commissionRate (0-100) and deliveryFee (nonnegative, max 2 decimal places)" });
    }
    const settings = await PaymentSettings.findOneAndUpdate(
      { key: "default" },
      { $set: { commissionRate, deliveryFee, updatedBy: req.user.id } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    return res.json({ message: "Settings saved for future orders", settings });
  } catch (e) { return res.status(500).json({ message: "Could not update payment settings" }); }
};

const getFinancialSummary = async (_req, res) => {
  try {
    const [orders, payouts] = await Promise.all([
      Order.find({ paymentStatus: "paid" }).select("subtotal deliveryFee totalAmount commissionAmount farmerEarnings deliveryEarnings status").lean(),
      Payout.find().populate("recipient", "name phone role").populate("order", "orderNumber").sort({ createdAt: -1 }).lean()
    ]);
    const sum = key => Math.round(orders.reduce((n, o) => n + (o[key] || 0), 0) * 100) / 100;
    return res.json({ summary: {
      paidOrders: orders.length, collectedGross: sum("totalAmount"),
      commissionGross: sum("commissionAmount"), deliveryFeesGross: sum("deliveryFee"),
      farmerAllocations: sum("farmerEarnings"), deliveryAllocations: sum("deliveryEarnings"),
      // Payouts are separate from collection; these figures are not cash balance.
      payoutsPending: payouts.filter(p => p.status === "pending").reduce((n,p) => n + p.amount,0),
      payoutsPaid: payouts.filter(p => p.status === "paid").reduce((n,p) => n + p.amount,0)
    }, payouts });
  } catch (e) { return res.status(500).json({ message: "Could not load financial summary" }); }
};

const preparePayouts = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.orderId)) return res.status(400).json({ message: "Invalid order ID" });
    const order = await Order.findById(req.params.orderId).lean();
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.paymentStatus !== "paid" || order.status !== "completed" ||
        order.deliveryStatus !== "delivered" || !order.buyerConfirmedDelivery || !order.deliveryAgent) {
      return res.status(409).json({ message: "Order must be paid, delivered and buyer-confirmed with an assigned delivery agent" });
    }
    // Do not silently apply new rates to legacy orders lacking a financial snapshot.
    if (![order.commissionAmount, order.farmerEarnings, order.deliveryEarnings].every(v => typeof v === "number")) {
      return res.status(409).json({ message: "Legacy order needs a reviewed financial breakdown before payout" });
    }
    const entries = [
      { recipientType: "farmer", recipient: order.farmer, amount: order.farmerEarnings },
      { recipientType: "deliveryAgent", recipient: order.deliveryAgent, amount: order.deliveryEarnings }
    ];
    for (const entry of entries) {
      await Payout.updateOne({ order: order._id, recipientType: entry.recipientType },
        { $setOnInsert: { order: order._id, ...entry, currency: "GMD", status: "pending" } },
        { upsert: true });
    }
    return res.json({ message: "Payouts prepared (not transferred)", payouts: await Payout.find({ order: order._id }) });
  } catch (e) { return res.status(500).json({ message: "Could not prepare payouts" }); }
};



const markPayoutPaid = async (req, res) => {
  try {
    const { payoutId } = req.params;
    const {
      transactionReference,
      provider,
      phoneNumber,
      accountHolderName,
      transferConfirmed,
    } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(payoutId)) {
      return res.status(400).json({
        message: "Invalid payout ID",
      });
    }

    if (
      typeof transactionReference !== "string" ||
      !transactionReference.trim() ||
      transactionReference.trim().length > 120
    ) {
      return res.status(400).json({
        message: "Valid transaction reference required",
      });
    }

    if (transferConfirmed !== true) {
      return res.status(400).json({
        message: "Confirm that the external transfer was completed",
      });
    }

    const payout = await Payout.findById(payoutId);

    if (!payout) {
      return res.status(404).json({
        message: "Payout not found",
      });
    }

    if (payout.status !== "pending") {
      return res.status(409).json({
        message: "Payout has already been processed",
      });
    }

    const recipient = await User.findById(payout.recipient)
      .select("name role payoutDetails");

    if (!recipient) {
      return res.status(404).json({
        message: "Recipient not found",
      });
    }

    const details = recipient.payoutDetails;

    if (!details?.isVerified) {
      return res.status(409).json({
        message: "Recipient payout details are not verified",
      });
    }

    const normalizedPhone = String(phoneNumber || "")
      .replace(/[\s-]/g, "")
      .replace(/^(?:\+220|220)/, "");

    const normalizedName = String(accountHolderName || "")
      .trim();

    if (
      provider !== details.provider ||
      normalizedPhone !== details.phoneNumber ||
      normalizedName.toLowerCase() !==
        details.accountHolderName.trim().toLowerCase()
    ) {
      return res.status(409).json({
        message:
          "Transfer destination does not match verified payout details",
      });
    }

    const reference = transactionReference.trim();

    const updated = await Payout.findOneAndUpdate(
      {
        _id: payoutId,
        status: "pending",
      },
      {
        $set: {
          status: "paid",
          payoutDestination: {
            provider,
            phoneNumber: normalizedPhone,
            accountHolderName: normalizedName,
          },
          transactionReference: reference,
          paidAt: new Date(),
          paidBy: req.user.id,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updated) {
      return res.status(409).json({
        message: "Payout already processed",
      });
    }

    return res.json({
      message: "External payout recorded successfully",
      payout: updated,
    });
  } catch (error) {
    console.error("Record payout error:", error);
    return res.status(500).json({
      message: "Could not record payout",
    });
  }
};




const verifyPayoutDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        message: "Invalid user ID",
      });
    }

    const user = await User.findOne({
      _id: userId,
      role: { $in: ["farmer", "deliveryAgent"] },
    });

    if (!user) {
      return res.status(404).json({
        message: "Farmer or delivery agent not found",
      });
    }

    const details = user.payoutDetails;

    if (
      !details ||
      !["wave", "aps"].includes(details.provider) ||
      !/^[0-9]{7}$/.test(details.phoneNumber || "") ||
      !details.accountHolderName?.trim()
    ) {
      return res.status(400).json({
        message: "User must provide valid payout details first",
      });
    }

    // Admin must verify account ownership outside FarmConnect.
    user.payoutDetails.isVerified = true;
    await user.save();

    return res.json({
      message: "Payout details marked as verified by admin",
      userId: user._id,
      payoutDetails: user.payoutDetails,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Could not verify payout details",
    });
  }
};


const getPayoutAccounts = async (req, res) => {
  try {
    const users = await User.find({
      role: { $in: ["farmer", "deliveryAgent"] },
      "payoutDetails.provider": { $in: ["wave", "aps"] },
    })
      .select("name role payoutDetails")
      .sort({ "payoutDetails.updatedAt": -1 })
      .lean();

    const accounts = users.map((user) => ({
      userId: user._id,
      name: user.name,
      role: user.role,
      provider: user.payoutDetails?.provider,
      phoneNumber: user.payoutDetails?.phoneNumber,
      accountHolderName:
        user.payoutDetails?.accountHolderName,
      isVerified:
        user.payoutDetails?.isVerified === true,
      updatedAt: user.payoutDetails?.updatedAt,
    }));

    return res.json({
      total: accounts.length,
      pendingVerification: accounts.filter(
        (account) => !account.isVerified
      ).length,
      accounts,
    });
  } catch (error) {
    console.error("Load payout accounts:", error);

    return res.status(500).json({
      message: "Could not load payout accounts",
    });
  }
};


module.exports = {
  getSettings,
  updateSettings,
  getFinancialSummary,
  preparePayouts,
  markPayoutPaid,
  verifyPayoutDetails,
  getPayoutAccounts,
};
