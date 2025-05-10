const jwt = require("jsonwebtoken");
const db = require("../models");
const User = db.user;
const TokenBlacklist = db.tokenBlacklist;

const authJwt = {};

// Helper function to extract token from header
authJwt.extractToken = (authHeader) => {
  if (!authHeader) return null;

  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  return authHeader;
};

authJwt.verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
      return res.status(403).json({
        status: "fail",
        message: "No token provided!",
      });
    }

    const token = authJwt.extractToken(authHeader);

    // Check if token is blacklisted
    const blacklistedToken = await TokenBlacklist.findOne({
      where: { token },
    });

    if (blacklistedToken) {
      return res.status(401).json({
        status: "fail",
        message: "Token has been revoked (logged out)",
      });
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.userId = decoded.id;
    req.userRole = decoded.role;
    req.token = token;

    next();
  } catch (error) {
    console.error("Token verification error:", error);
    return res.status(401).json({
      status: "fail",
      message: "Unauthorized! Token is invalid or expired.",
    });
  }
};

authJwt.isActive = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.userId);

    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "User not found!",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        status: "fail",
        message: "Account is inactive!",
      });
    }

    req.user = user;

    next();
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message || "Something went wrong!",
    });
  }
};

authJwt.isAdmin = (req, res, next) => {
  if (req.userRole !== "admin") {
    return res.status(403).json({
      status: "fail",
      message: "Requires admin privileges!",
    });
  }

  next();
};

authJwt.verifyActiveUser = [authJwt.verifyToken, authJwt.isActive];

authJwt.verifyAdmin = [authJwt.verifyToken, authJwt.isActive, authJwt.isAdmin];

authJwt.refreshToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];

    if (!authHeader) {
      return next();
    }

    const token = authJwt.extractToken(authHeader);

    // Check if token is blacklisted
    const blacklistedToken = await TokenBlacklist.findOne({
      where: { token },
    });

    if (blacklistedToken) {
      return res.status(401).json({
        status: "fail",
        message: "Token has been revoked",
      });
    }

    const decoded = jwt.decode(token);

    if (!decoded) {
      return next();
    }

    const now = Math.floor(Date.now() / 1000);

    // If token will expire in less than an hour (3600 seconds)
    if (decoded.exp - now < 3600) {
      try {
        // Verify token is still valid
        jwt.verify(token, process.env.JWT_SECRET);

        // Generate new token
        const newToken = jwt.sign(
          { id: decoded.id, role: decoded.role },
          process.env.JWT_SECRET,
          { expiresIn: "24h" }
        );

        res.setHeader("x-refresh-token", newToken);
      } catch (error) {
        console.error("Token refresh error:", error);
      }
    }

    next();
  } catch (error) {
    console.error("Refresh token error:", error);
    next();
  }
};

authJwt.optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];

    if (!authHeader) {
      return next();
    }

    const token = authJwt.extractToken(authHeader);

    // Check if token is blacklisted
    const blacklistedToken = await TokenBlacklist.findOne({
      where: { token },
    });

    if (blacklistedToken) {
      return next();
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.userId = decoded.id;
      req.userRole = decoded.role;
      req.token = token;

      const user = await User.findByPk(req.userId);
      if (user && user.isActive) {
        req.user = user;
      }

      next();
    } catch (error) {
      next();
    }
  } catch (error) {
    console.error("Optional auth error:", error);
    next();
  }
};

authJwt.cleanupExpiredTokens = async () => {
  try {
    const now = new Date();

    const deleted = await TokenBlacklist.destroy({
      where: {
        expiresAt: {
          [db.Sequelize.Op.lt]: now,
        },
      },
    });

    console.log(`Cleaned up ${deleted} expired token(s) from blacklist`);
  } catch (error) {
    console.error("Error cleaning up expired tokens:", error);
  }
};

module.exports = authJwt;
