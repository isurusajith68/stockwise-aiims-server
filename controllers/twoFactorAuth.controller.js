const speakeasy = require("speakeasy");
const QRCode = require("qrcode");
const db = require("../models");
const User = db.user;
const TwoFactorAuth = db.twoFactorAuth;
const bcrypt = require("bcryptjs");
exports.setup2FA = async (req, res, next) => {
  try {
    const userId = req.userId;
    console.log("User ID:", userId);
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate a secret
    const speakeasy = require("speakeasy");
    const QRCode = require("qrcode");

    const secret = speakeasy.generateSecret({
      name: `STOCKWISE:${user.email}`,
    });

    let twoFactorAuth = await db.twoFactorAuth.findOne({
      where: { userId },
    });

    if (twoFactorAuth) {
      twoFactorAuth.secret = secret.base32;
      twoFactorAuth.isEnabled = false;
      await twoFactorAuth.save();
    } else {
      twoFactorAuth = await TwoFactorAuth.create({
        userId,
        secret: secret.base32,
        isEnabled: false,
      });
    }

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    return res.json({
      message: "Two-factor authentication setup initiated",
      qrCode: qrCodeUrl,
      secret: secret.base32,
      isEnabled: false,
    });
  } catch (error) {
    console.error("2FA Setup Error:", error);
    next(error);
  }
};

exports.verify2FA = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { token } = req.body;

    const twoFactorAuth = await TwoFactorAuth.findOne({
      where: { userId },
    });

    if (!twoFactorAuth) {
      return res.status(404).json({
        status: "fail",
        message: "Two-factor authentication not set up",
      });
    }

    const verified = speakeasy.totp.verify({
      secret: twoFactorAuth.secret,
      encoding: "base32",
      token,
    });

    if (!verified) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid verification code",
      });
    }

    twoFactorAuth.isEnabled = true;

    const backupCodes = [];
    for (let i = 0; i < 10; i++) {
      backupCodes.push(
        Math.random().toString(36).substring(2, 10).toUpperCase()
      );
    }
    twoFactorAuth.backupCodes = backupCodes;

    await twoFactorAuth.save();

    return res.json({
      status: "success",
      message: "Two-factor authentication enabled successfully",
      backupCodes,
    });
  } catch (error) {
    next(error);
  }
};

exports.disable2FA = async (req, res, next) => {
  try {
    const userId = req.userId;

    const twoFactorAuth = await TwoFactorAuth.findOne({
      where: { userId },
    });

    if (!twoFactorAuth) {
      return res.status(404).json({
        status: "fail",
        message: "Two-factor authentication not set up",
      });
    }

    const user = await User.findByPk(userId);
    const passwordValid = bcrypt.compareSync(req.body.password, user.password);

    if (!passwordValid) {
      return res.status(401).json({
        status: "fail",
        message: "Invalid password",
      });
    }

    twoFactorAuth.isEnabled = false;
    await twoFactorAuth.save();

    return res.json({
      status: "success",
      message: "Two-factor authentication disabled successfully",
    });
  } catch (error) {
    next(error);
  }
};

exports.get2FAStatus = async (req, res, next) => {
  try {
    const userId = req.userId;

    const twoFactorAuth = await TwoFactorAuth.findOne({
      where: { userId },
    });

    if (!twoFactorAuth) {
      return res.status(404).json({
        status: "fail",
        message: "Two-factor authentication not set up",
      });
    }

    return res.json({
      status: "success",
      isEnabled: twoFactorAuth.isEnabled,
    });
  } catch (error) {
    next(error);
  }
};
