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

  // Create a new product
  app.post("/api/products", [verifyActiveUser], controller.create);

  // Retrieve all products for a user
  app.get("/api/products", [verifyActiveUser], controller.findAll);
  
  // Get low stock products - must be before the :id route
  app.get("/api/products/low-stock", [verifyActiveUser], controller.getLowStock);

  // Retrieve a single product by id
  app.get("/api/products/:id", [verifyActiveUser], controller.findOne);

  // Update a product
  app.put("/api/products/:id", [verifyActiveUser], controller.update);

  // Delete a product
  app.delete("/api/products/:id", [verifyActiveUser], controller.delete);
};
