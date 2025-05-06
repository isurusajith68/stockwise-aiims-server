const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const {
  validateRegistration,
  validateLogin,
} = require("../middleware/validateData");
const { verifyToken } = require("../middleware/auth.jwt");

// Register new user
router.post("/register", validateRegistration, authController.register);

// User login
router.post("/login", validateLogin, authController.login);

// Refresh token
router.post("/refresh-token", verifyToken, authController.refreshToken);

module.exports = router;
