const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const { verifyToken, isAdmin } = require("../middleware/auth.jwt");
const { validateUserUpdate } = require("../middleware/validateData");

// Get current user profile
router.get("/profile", verifyToken, userController.getProfile);

// Admin-only routes
router.get("/", [verifyToken, isAdmin], userController.findAll);
router.get("/:id", [verifyToken, isAdmin], userController.findOne);
router.put(
  "/:id",
  [verifyToken, isAdmin, validateUserUpdate],
  userController.update
);
router.delete("/:id", [verifyToken, isAdmin], userController.delete);

module.exports = router;
