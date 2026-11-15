
const AuditLog = require("../models/AuditLog");

const createAuditLog = async ({
  admin,
  action,
  targetType,
  targetId,
  details = {},
  ipAddress = "",
}) => {
  try {
    return await AuditLog.create({
      admin,
      action,
      targetType,
      targetId,
      details,
      ipAddress,
    });
  } catch (error) {
    console.error("Audit log creation failed:", error);
    return null;
  }
};

module.exports = createAuditLog;
