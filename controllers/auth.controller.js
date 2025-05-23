const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const db = require("../models");
const User = db.user;
const LoginHistory = db.loginHistory;
const TwoFactorAuth = db.twoFactorAuth;
const TokenBlacklist = db.tokenBlacklist;
const speakeasy = require("speakeasy");
const { Op } = require("sequelize");
const informationModel = db.information;
const sequelize = db.sequelize;

exports.login = async (req, res, next) => {
  try {
    const { identifier, password, token } = req.body; // Use 'identifier' instead of 'username'

    const user = await User.findOne({
      where: {
        [Op.or]: [{ username: identifier }, { email: identifier }], // Match either username or email
      },
    });

    const loginAttempt = {
      userId: user ? user.id : null,
      ipAddress: req.ipAddress || req.ip || req.headers["x-forwarded-for"],
      deviceInfo:
        req.deviceInfo || req.headers["user-agent"] || "Unknown device",
      location: req.location || "Unknown location",
      status: "failed",
      loginTime: new Date(),
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

        return res.status(200).json({
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

      const isBackupCode =
        twoFactorAuth.backupCodes &&
        Array.isArray(twoFactorAuth.backupCodes) &&
        twoFactorAuth.backupCodes.includes(token);

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

    const accessToken = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    user.lastLogin = new Date();
    user.loginDevice = loginAttempt.deviceInfo;
    user.loginLocation = loginAttempt.location;
    user.loginIp = loginAttempt.ipAddress;
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
      accessToken,
    });
  } catch (error) {
    console.error("Login error:", error);
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
      req.ip || req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    const userDevice = req.headers["user-agent"] || "Unknown device";
    const userLocation = req.location || "Unknown location";

    const user = await User.create(
      {
        username: req.body.username,
        email: req.body.email.toLowerCase(),
        password: bcrypt.hashSync(req.body.password, 10),
        phone: req.body.phone,
        role: req.body.role && req.body.role === "admin" ? "admin" : "user",
        isActive: true,
        lastLogin: new Date(),
        loginDevice: userDevice,
        loginLocation: userLocation,
        loginIp: userIp,
      },
      { transaction: t }
    );

    await informationModel.create(
      {
        userId: user.id,
        storeName: req.body.companyName,
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
      accessToken: token,
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
      limit: 10,
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

    if (req.token) {
      const decoded = jwt.decode(req.token);
      if (decoded && decoded.exp) {
        const expiresAt = new Date(decoded.exp * 1000);

        const existingToken = await TokenBlacklist.findOne({
          where: { token: req.token },
        });

        if (!existingToken) {
          await TokenBlacklist.create({
            token: req.token,
            expiresAt: expiresAt,
            userId: userId,
          });
        }
      }
    }

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

exports.logout = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
      return res.status(400).json({
        status: "fail",
        message: "No token provided",
      });
    }

    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : authHeader;

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

    if (ttl > 0) {
      const existingToken = await TokenBlacklist.findOne({
        where: { token },
      });

      if (!existingToken) {
        await TokenBlacklist.create({
          token: token,
          expiresAt: new Date(expiresAt * 1000),
          userId: req.userId,
        });
      }
    }

    return res.status(200).json({
      status: "success",
      message: "Successfully logged out",
    });
  } catch (error) {
    console.error("Logout error:", error);
    next(error);
  }
};

exports.setupTokenCleanup = () => {
  setInterval(async () => {
    try {
      const now = new Date();

      const deleted = await TokenBlacklist.destroy({
        where: {
          expiresAt: {
            [Op.lt]: now,
          },
        },
      });

      console.log(`Cleaned up ${deleted} expired token(s) from blacklist`);
    } catch (error) {
      console.error("Error cleaning up expired tokens:", error);
    }
  }, 12 * 60 * 60 * 1000);

  console.log("Token cleanup scheduler initialized");
};
