
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Check for Bearer token
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Not authorized. Please provide a valid token.",
      });
    }

    const token = authHeader.split(" ")[1];

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get current user from MongoDB
    const user = await User.findById(decoded.id).select(
      "_id role status"
    );

    // Check if the user still exists
    if (!user) {
      return res.status(401).json({
        message: "User account no longer exists.",
      });
    }

    // Block inactive or suspended accounts
    if (user.status !== "active") {
      return res.status(403).json({
        message: "Your account is inactive or suspended. Please contact the administrator.",
      });
    }

    // Use current database role and ID
    req.user = {
      id: user._id.toString(),
      _id: user._id,
      role: user.role,
    };

    next();
  } catch (error) {
    console.error(
      "Authentication Error:",
      error.name,
      error.message
    );

    return res.status(401).json({
      message: "Not authorized. Invalid or expired token.",
    });
  }
};

module.exports = protect;
