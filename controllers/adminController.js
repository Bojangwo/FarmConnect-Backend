
const User = require("../models/User");
const Order = require("../models/Order");

// Admin: Get all registered users
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("-password")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("Error fetching users:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
};



const updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const allowedStatuses = ["active", "inactive", "suspended"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid account status",
      });
    }

    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Prevent administrators from disabling their own accounts
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You cannot change your own account status",
      });
    }

    // Protect administrator accounts from this operation
    if (user.role === "admin") {
      return res.status(403).json({
        success: false,
        message: "Administrator accounts cannot be modified here",
      });
    }

    user.status = status;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User account updated to ${status}`,
      user: {
        _id: user._id,
        name: user.name,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    console.error("Error updating user status:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update user status",
    });
  }
};


const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("buyer", "name phone")
      .populate("farmer", "name phone")
      .populate("product", "name images")
      .populate("deliveryAgent", "name phone")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error("Admin get orders error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
    });
  }
};


module.exports = {
  getAllUsers,
  updateUserStatus,
  getAllOrders,
};
