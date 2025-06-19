const { verifyActiveUser } = require("../middleware/authJwt");
const controller = require("../controllers/product.controller");

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, Content-Type, Accept, Authorization"
    );
    next();
  });

  app.post("/api/products", [verifyActiveUser], controller.create);

  app.get("/api/products", [verifyActiveUser], controller.findAll);
  
  app.get("/api/products/low-stock", [verifyActiveUser], controller.getLowStock);

  app.get("/api/products/:id", [verifyActiveUser], controller.findOne);

  app.put("/api/products/:id", [verifyActiveUser], controller.update);

  app.delete("/api/products/:id", [verifyActiveUser], controller.delete);
};
