
const Notification = require("../models/Notification");

const createNotification = async ({
  recipient,
  type,
  title,
  message,
  link = "",
}) => {
  if (!recipient) {
    return null;
  }

  try {
    return await Notification.create({
      recipient,
      type,
      title,
      message,
      link,
    });
  } catch (error) {
    console.error("Notification creation failed:", error);
    return null;
  }
};

module.exports = createNotification;
