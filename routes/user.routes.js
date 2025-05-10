const { authJwt, verifyToken, optionalAuth } = require("../middleware/authJwt");
const controller = require("../controllers/user.controller");

module.exports = function (app) {
  // app.use(function (req, res, next) {
  //   res.header(
  //     "Access-Control-Allow-Headers",
  //     "Origin, Content-Type, Accept, Authorization"
  //   );
  //   next();
  // });

  // // app.get("/api/users/public", controller.publicAccess);

  // app.get(
  //   "/api/users/profile",
  //   [authJwt.verifyActiveUser],
  //   controller.userProfile
  // );

  // app.get("/api/users/admin", [verifyToken], controller.adminAccess);

  // app.get("/api/users/content", [optionalAuth], controller.getContent);

  // app.post("/api/auth/logout", [verifyToken], controller.logout);
};
