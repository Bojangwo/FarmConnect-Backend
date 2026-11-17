const AuditLog = require("../models/AuditLog");

const getAuditLogs = async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = 20;

    const [logs, total] = await Promise.all([
      AuditLog.find()
        .populate("admin", "name email")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      AuditLog.countDocuments(),
    ]);

    return res.json({
      logs,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Get audit logs error:", error);

    return res.status(500).json({
      message: "Failed to load audit logs",
    });
  }
};

module.exports = { getAuditLogs };
