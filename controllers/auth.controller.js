const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const db = require("../models");
const User = db.user;
const LoginHistory = db.loginHistory;
const TwoFactorAuth = db.twoFactorAuth;
const speakeasy = require("speakeasy");
const { Op } = require("sequelize");
const sequelize = db.sequelize;

exports.login = async (req, res, next) => {
  try {
    const { identifier, password, token } = req.body; // Use 'identifier' instead of 'username'

    const user = await User.findOne({
      where: {
        [Op.or]: [{ username: identifier }, { email: identifier }], // Match either username or email
      },
    });
    console.log("User found:", user);

    const loginAttempt = {
      userId: user ? user.id : undefined, // Ensure userId is only set if user exists
      ipAddress: req.ipAddress,
      deviceInfo: req.deviceInfo,
      location: req.location,
      status: "failed",
    };

    if (!user) {
      loginAttempt.failureReason = "User not found";
      // await LoginHistory.create(loginAttempt);

      return res.status(404).json({
        status: "fail",
        message: "User not found",
      });
    }

    if (!user.isActive) {
      loginAttempt.failureReason = "Account inactive";
      await LoginHistory.create(loginAttempt);

      return res.status(403).json({
        status: "fail",
        message: "Account is inactive",
      });
    }

    const passwordValid = bcrypt.compareSync(password, user.password);

    if (!passwordValid) {
      loginAttempt.failureReason = "Invalid password";
      await LoginHistory.create(loginAttempt);

      return res.status(401).json({
        status: "fail",
        message: "Invalid password",
      });
    }

    const twoFactorAuth = await TwoFactorAuth.findOne({
      where: { userId: user.id, isEnabled: true },
    });

    if (twoFactorAuth) {
      if (!token) {
        loginAttempt.failureReason = "2FA token required";
        await LoginHistory.create(loginAttempt);

        return res.status(401).json({
          status: "fail",
          message: "2FA verification required",
          require2FA: true,
        });
      }

      const verified = speakeasy.totp.verify({
        secret: twoFactorAuth.secret,
        encoding: "base32",
        token,
      });

      const isBackupCode = twoFactorAuth.backupCodes.includes(token);

      if (!verified && !isBackupCode) {
        loginAttempt.failureReason = "Invalid 2FA token";
        await LoginHistory.create(loginAttempt);

        return res.status(401).json({
          status: "fail",
          message: "Invalid 2FA verification code",
        });
      }

      if (isBackupCode) {
        twoFactorAuth.backupCodes = twoFactorAuth.backupCodes.filter(
          (code) => code !== token
        );
        await twoFactorAuth.save();
      }
    }

    const tokens = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    user.lastLogin = new Date();
    user.loginDevice = req.deviceInfo;
    user.loginLocation = req.location;
    user.loginIp = req.ipAddress;
    await user.save();

    loginAttempt.status = "success";
    delete loginAttempt.failureReason;
    await LoginHistory.create(loginAttempt);

    return res.status(200).json({
      status: "success",
      message: "Login successful",
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      tokens,
    });
  } catch (error) {
    next(error);
  }
};

exports.register = async (req, res, next) => {
  const t = await sequelize.transaction();

  try {
    if (!req.body.username || !req.body.email || !req.body.password) {
      return res.status(400).json({
        status: "fail",
        message: "Username, email and password are required",
      });
    }

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(req.body.password)) {
      return res.status(400).json({
        status: "fail",
        message:
          "Password must be at least 8 characters and include uppercase, lowercase, number and special character",
      });
    }

    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ username: req.body.username }, { email: req.body.email }],
      },
      transaction: t,
    });

    if (existingUser) {
      await t.rollback();
      return res.status(409).json({
        status: "fail",
        message:
          existingUser.username === req.body.username
            ? "Username already in use"
            : "Email already registered",
      });
    }

    const userIp =
      req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    const userDevice = req.headers["user-agent"] || "Unknown device";
    const userLocation = req.location || "Unknown location";

    const user = await User.create(
      {
        username: req.body.username,
        email: req.body.email.toLowerCase(),
        password: bcrypt.hashSync(req.body.password, 10),
        role: req.body.role && req.body.role === "admin" ? "admin" : "user",
        isActive: true,
        lastLogin: new Date(),
        loginDevice: userDevice,
        loginLocation: userLocation,
        loginIp: userIp,
      },
      { transaction: t }
    );

    await LoginHistory.create(
      {
        userId: user.id,
        ipAddress: userIp,
        deviceInfo: userDevice,
        location: userLocation,
        loginTime: new Date(),
        status: "success",
      },
      { transaction: t }
    );

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    await t.commit();

    return res.status(201).json({
      status: "success",
      message: "User registered successfully!",
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

exports.getLoginHistory = async (req, res, next) => {
  try {
    const userId = req.userId;

    const loginHistory = await LoginHistory.findAll({
      where: { userId },
      order: [["loginTime", "DESC"]],
      limit: 10, // Get last 10 logins
    });

    return res.status(200).json({
      status: "success",
      data: loginHistory,
    });
  } catch (error) {
    next(error);
  }
};

exports.refreshToken = async (req, res, next) => {
  try {
    const userId = req.userId;
    const userRole = req.userRole;

    const newToken = jwt.sign(
      { id: userId, role: userRole },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    // But generally for refresh, we don't invalidate the old one immediately
    // if (req.token) {
    //   const decoded = jwt.decode(req.token);
    //   if (decoded && decoded.exp) {
    //     const expiresAt = new Date(decoded.exp * 1000);
    //     await db.tokenBlacklist.create({
    //       token: req.token,
    //       expiresAt: expiresAt,
    //       userId: userId,
    //     });
    //   }
    // }

    return res.status(200).json({
      status: "success",
      message: "Token refreshed successfully",
      data: {
        accessToken: newToken,
      },
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    next(error);
  }
};

async function cleanupExpiredTokens() {
  try {
    const TokenBlacklist = db.tokenBlacklist;
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
}
exports.logout = async (req, res, next) => {
  try {
    const token = req.headers["authorization"]?.replace("Bearer ", "");

    if (!token) {
      return res.status(400).json({
        status: "fail",
        message: "No token provided",
      });
    }

    const decoded = jwt.decode(token);

    if (!decoded) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid token",
      });
    }

    const expiresAt = decoded.exp;
    const now = Math.floor(Date.now() / 1000);
    const ttl = expiresAt - now;

    const TokenBlacklist = db.tokenBlacklist;

    if (ttl > 0) {
      await TokenBlacklist.create({
        token: token,
        expiresAt: new Date(expiresAt * 1000),
        userId: req.userId,
      });
    }

    /* 
    // Option 2: If you want to use Redis instead (commented out)
    // Make sure to require and configure Redis client at the top of the file
    // const redis = require('redis');
    // const redisClient = redis.createClient(process.env.REDIS_URL);
    
    if (ttl > 0) {
      await redisClient.setEx(`blacklist:${token}`, ttl, "1");
    }
    */

    return res.status(200).json({
      status: "success",
      message: "Successfully logged out",
    });
  } catch (error) {
    console.error("Logout error:", error);
    next(error);
  }
};
