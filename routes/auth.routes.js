const { loginLimiter } = require("../middleware/rateLimitMiddleware");
const { extractUserInfo } = require("../middleware/userInfoMiddleware");
const controller = require("../controllers/auth.controller");
const twoFactorController = require("../controllers/twoFactorAuth.controller");
const authJwt = require("../middleware/authJwt");
const {
  validateRegistration,
  validateLogin,
} = require("../middleware/validateData");

module.exports = (app) => {
  app.use((req, res, next) => {
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, Content-Type, Accept, Authorization, x-refresh-token"
    );
    res.header("Access-Control-Expose-Headers", "x-refresh-token");
    next();
  });

  app.use(authJwt.refreshToken);

  app.post(
    "/api/auth/register",
    validateRegistration,
    extractUserInfo,
    controller.register
  );

  app.post(
    "/api/auth/login",
    [
      // loginLimiter,
      extractUserInfo,
      validateLogin,
    ],
    controller.login
  );

  app.post(
    "/api/auth/2fa/setup",
    authJwt.verifyToken,
    twoFactorController.setup2FA
  );

  app.post(
    "/api/auth/2fa/verify",
    authJwt.verifyToken,
    twoFactorController.verify2FA
  );

  app.post(
    "/api/auth/2fa/disable",
    authJwt.verifyToken,
    twoFactorController.disable2FA
  );
  app.get(
    "/api/auth/2fa/status",
    authJwt.verifyToken,
    twoFactorController.get2FAStatus
  );
  app.get(
    "/api/auth/login-history",
    authJwt.verifyToken,
    controller.getLoginHistory
  );

  app.post(
    "/api/auth/refresh-token",
    authJwt.verifyToken,
    controller.refreshToken
  );

  app.post("/api/auth/logout", authJwt.verifyToken, controller.logout);

  // Password reset request
  // app.post("/api/auth/reset-password-request", controller.resetPasswordRequest);

  // Password reset with token
  // app.post("/api/auth/reset-password", controller.resetPassword);
};
