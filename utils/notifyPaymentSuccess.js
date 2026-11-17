const createNotification = require("./createNotification");

async function notifyPaymentSuccess(order) {
  const orderNumber = order.orderNumber || "your order";

  await createNotification({
    recipient: order.buyer,
    type: "payment_successful",
    title: "Payment successful",
    message: `Your payment for order ${orderNumber} was successful.`,
    link: "/buyer/orders",
  });

  await createNotification({
    recipient: order.farmer,
    type: "order_paid",
    title: "Order payment received",
    message: `Payment has been confirmed for order ${orderNumber}.`,
    link: "/farmer/orders",
  });
}

module.exports = notifyPaymentSuccess;
