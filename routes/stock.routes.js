const express = require("express");
const router = express.Router();
const { authJwt } = require("../middleware");
const stockController = require("../controllers/stock.controller");

router.use([authJwt.verifyToken]);

router.get("/", stockController.findAll);

router.get("/:id", stockController.findOne);

router.post("/", stockController.create);

router.put("/:id", stockController.update);

router.delete("/:id", stockController.delete);

router.post("/:id/adjust", stockController.adjustStock);

router.get("/reports/low-stock", stockController.getLowStock);

router.get("/:id/history", stockController.getStockHistory);

router.post("/batch-update", stockController.batchUpdate);

router.get("/export/data", stockController.exportStockData);

module.exports = router;
