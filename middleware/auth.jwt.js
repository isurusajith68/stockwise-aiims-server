const jwt = require("jsonwebtoken");
const db = require("../models");
const User = db.user;

// Verify token middleware
exports.verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      status: "error",
      message: "No token provided",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    return res.status(401).json({
      status: "error",
      message: "Unauthorized: Invalid token",
    });
  }
};

// Check if admin middleware
exports.isAdmin = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.userId);

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    if (user.role !== "admin") {
      return res.status(403).json({
        status: "error",
        message: "Unauthorized: Admin access required",
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};
