const jwt = require("jsonwebtoken");
const db = require("../models");
const User = db.user;
const TokenBlacklist = db.tokenBlacklist;

const authJwt = {};

authJwt.verifyToken = async (req, res, next) => {
  try {
    let token = req.headers["authorization"];

    if (!token) {
      return res.status(403).json({
        status: "fail",
        message: "No token provided!",
      });
    }

    if (token.startsWith("Bearer ")) {
      token = token.slice(7, token.length);
    }

    const blacklistedToken = await TokenBlacklist.findOne({
      where: { token },
    });

    if (blacklistedToken) {
      return res.status(401).json({
        status: "fail",
        message: "Token has been revoked (logged out)",
      });
    }

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
    const token = req.headers["authorization"];

    if (!token) {
      return next();
    }

    let cleanToken = token;
    if (cleanToken.startsWith("Bearer ")) {
      cleanToken = cleanToken.slice(7, cleanToken.length);
    }

    const blacklistedToken = await TokenBlacklist.findOne({
      where: { token: cleanToken },
    });

    if (blacklistedToken) {
      return res.status(401).json({
        status: "fail",
        message: "Token has been revoked",
      });
    }

    const decoded = jwt.decode(cleanToken);

    if (!decoded) {
      return next();
    }

    const now = Math.floor(Date.now() / 1000);

    if (decoded.exp - now < 3600) {
      try {
        jwt.verify(cleanToken, process.env.JWT_SECRET);

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
    let token = req.headers["authorization"];

    if (!token) {
      return next();
    }

    if (token.startsWith("Bearer ")) {
      token = token.slice(7, token.length);
    }

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

module.exports = authJwt;
