
const Payout = require("../models/Payout");
const User = require("../models/User");

const getMyEarnings = async (req, res) => {
  try {
    const userId = req.user.id;

    const [user, payouts] = await Promise.all([
      User.findById(userId)
        .select("name role payoutDetails")
        .lean(),

      Payout.find({ recipient: userId })
        .populate("order", "orderNumber")
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const round = (value) =>
      Math.round(value * 100) / 100;

    const pending = payouts
      .filter((p) => p.status === "pending")
      .reduce((sum, p) => sum + p.amount, 0);

    const paid = payouts
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + p.amount, 0);

    return res.json({
      user: {
        name: user.name,
        role: user.role,
        payoutDetails: user.payoutDetails || null,
      },
      summary: {
        totalAllocated: round(pending + paid),
        pendingPayouts: round(pending),
        recordedPayouts: round(paid),
        payoutCount: payouts.length,
      },
      payouts: payouts.map((p) => ({
        _id: p._id,
        orderNumber: p.order?.orderNumber || "Unknown",
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        provider: p.payoutDestination?.provider || null,
        paidAt: p.paidAt,
        createdAt: p.createdAt,
        // No admin IDs or transaction references
        // are exposed in this summary.
      })),
    });
  } catch (error) {
    console.error("Get earnings error:", error);
    return res.status(500).json({
      message: "Could not load earnings",
    });
  }
};

module.exports = { getMyEarnings };
