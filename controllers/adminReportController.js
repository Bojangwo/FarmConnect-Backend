
const Order = require("../models/Order");
const Payment = require("../models/Payment");
const Payout = require("../models/Payout");
const User = require("../models/User");

const round = (value) => Math.round(value * 100) / 100;

const getAdminReports = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const validDate = (value) =>
      !value || !Number.isNaN(new Date(value).getTime());

    if (!validDate(startDate) || !validDate(endDate)) {
      return res.status(400).json({
        message: "Invalid startDate or endDate",
      });
    }

    const start = startDate
      ? new Date(`${startDate}T00:00:00.000Z`)
      : null;

    const end = endDate
      ? new Date(`${endDate}T23:59:59.999Z`)
      : null;

    if (
      (startDate && Number.isNaN(start.getTime())) ||
      (endDate && Number.isNaN(end.getTime())) ||
      (start && end && start > end)
    ) {
      return res.status(400).json({
        message: "Invalid date range",
      });
    }

    const inRange = (date) => {
      if (!date) return false;
      const value = new Date(date);
      return (!start || value >= start) &&
        (!end || value <= end);
    };

    const [orders, payments, payouts, users] =
      await Promise.all([
        Order.find()
          .select(
            "orderNumber product farmer buyer quantity subtotal " +
            "deliveryFee totalAmount commissionAmount " +
            "farmerEarnings deliveryEarnings status " +
            "paymentStatus paidAt createdAt"
          )
          .populate("product", "name category")
          .lean(),

        Payment.find({ status: "successful" })
          .select("order amount paidAt createdAt")
          .lean(),

        Payout.find()
          .select("amount status paidAt createdAt")
          .lean(),

        User.find()
          .select("role createdAt")
          .lean(),
      ]);

    const selectedOrders = orders.filter((o) =>
      inRange(o.createdAt)
    );

    const paidOrders = orders.filter(
      (o) =>
        o.paymentStatus === "paid" &&
        inRange(o.paidAt || o.createdAt)
    );

    const selectedPayments = payments.filter((p) =>
      inRange(p.paidAt || p.createdAt)
    );

    const selectedPayouts = payouts.filter((p) =>
      inRange(p.status === "paid"
        ? p.paidAt || p.createdAt
        : p.createdAt)
    );

    const selectedUsers = users.filter((u) =>
      inRange(u.createdAt)
    );

    const sum = (records, field) =>
      round(records.reduce(
        (total, record) =>
          total + (Number(record[field]) || 0),
        0
      ));

    const orderStatuses = {};
    for (const status of [
      "pending",
      "confirmed",
      "processing",
      "ready_for_delivery",
      "completed",
      "cancelled",
    ]) {
      orderStatuses[status] =
        selectedOrders.filter((o) => o.status === status).length;
    }

    const usersByRole = {};
    for (const role of [
      "farmer",
      "buyer",
      "deliveryAgent",
      "admin",
    ]) {
      usersByRole[role] =
        selectedUsers.filter((u) => u.role === role).length;
    }

    const monthlyMap = new Map();

    for (const payment of selectedPayments) {
      const date = payment.paidAt || payment.createdAt;
      const month = new Date(date)
        .toISOString()
        .slice(0, 7);

      if (!monthlyMap.has(month)) {
        monthlyMap.set(month, {
          month,
          grossCollected: 0,
          payments: 0,
        });
      }

      const entry = monthlyMap.get(month);
      entry.grossCollected += Number(payment.amount) || 0;
      entry.payments += 1;
    }

    const monthlySales = [...monthlyMap.values()]
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((item) => ({
        ...item,
        grossCollected: round(item.grossCollected),
      }));

    const productMap = new Map();

    for (const order of paidOrders) {
      const productId = String(
        order.product?._id || order.product || "unknown"
      );

      if (!productMap.has(productId)) {
        productMap.set(productId, {
          productId,
          name: order.product?.name || "Deleted product",
          quantitySold: 0,
          salesValue: 0,
          orders: 0,
        });
      }

      const entry = productMap.get(productId);
      entry.quantitySold += Number(order.quantity) || 0;
      entry.salesValue += Number(order.subtotal) || 0;
      entry.orders += 1;
    }

    const topProducts = [...productMap.values()]
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 10)
      .map((item) => ({
        ...item,
        salesValue: round(item.salesValue),
      }));

    const completed = orderStatuses.completed;
    const cancelled = orderStatuses.cancelled;
    const totalOrders = selectedOrders.length;

    return res.json({
      period: {
        startDate: startDate || null,
        endDate: endDate || null,
      },

      financial: {
        grossCollected: sum(selectedPayments, "amount"),
        commissionGross: sum(paidOrders, "commissionAmount"),
        deliveryFeesGross: sum(paidOrders, "deliveryFee"),
        farmerAllocations: sum(paidOrders, "farmerEarnings"),
        deliveryAllocations: sum(paidOrders, "deliveryEarnings"),
        pendingPayouts: sum(
          selectedPayouts.filter((p) => p.status === "pending"),
          "amount"
        ),
        recordedPayouts: sum(
          selectedPayouts.filter((p) => p.status === "paid"),
          "amount"
        ),
      },

      orders: {
        total: totalOrders,
        byStatus: orderStatuses,
        completionRate: totalOrders
          ? round((completed / totalOrders) * 100)
          : 0,
        cancellationRate: totalOrders
          ? round((cancelled / totalOrders) * 100)
          : 0,
      },

      users: {
        totalRegistered: selectedUsers.length,
        byRole: usersByRole,
      },

      monthlySales,
      topProducts,
    });
  } catch (error) {
    console.error("Admin reports error:", error);

    return res.status(500).json({
      message: "Could not generate admin reports",
    });
  }
};

module.exports = { getAdminReports };
