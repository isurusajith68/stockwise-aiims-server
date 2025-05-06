const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../models");
const User = db.user;

exports.register = async (req, res, next) => {
  try {
    // Create new user
    const user = await User.create({
      username: req.body.username,
      email: req.body.email,
      password: bcrypt.hashSync(req.body.password, 8), // Hash password
      role: req.body.role ? req.body.role : "user",
    });

    return res.status(201).json({
      status: "success",
      message: "User registered successfully!",
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    // Find user by username
    const user = await User.findOne({
      where: {
        username: req.body.username,
      },
    });

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    // Verify password
    const isPasswordValid = bcrypt.compareSync(
      req.body.password,
      user.password
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        status: "error",
        message: "Invalid password",
      });
    }

    // Update last login
    await user.update({
      lastLogin: new Date(),
    });

    // Generate token
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRATION,
      }
    );

    return res.status(200).json({
      status: "success",
      message: "Login successful",
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        accessToken: token,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.refreshToken = async (req, res, next) => {
  try {
    // Verify existing token
    const userId = req.userId;

    // Find user by ID
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    // Generate new token
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRATION,
      }
    );

    return res.status(200).json({
      status: "success",
      message: "Token refreshed successfully",
      data: {
        accessToken: token,
      },
    });
  } catch (error) {
    next(error);
  }
};
