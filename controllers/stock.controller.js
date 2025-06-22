const db = require("../models");
const Stock = db.stock;
const StockHistory = db.stockHistory;
const Product = db.product;
const { Op } = require("sequelize");

// Find all stock items with pagination and filtering
exports.findAll = async (req, res, next) => {
  try {
    const { page = 1, size = 10, search, sortBy, sortOrder, category } = req.query;
    
    const limit = parseInt(size);
    const offset = (parseInt(page) - 1) * limit;
    
    const condition = {};
    if (search) {
      condition[Op.or] = [
        { '$product.name$': { [Op.iLike]: `%${search}%` } },
        { '$product.sku$': { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    if (category) {
      condition['$product.categoryId$'] = category;
    }
    
    const sorting = [];
    if (sortBy) {
      sorting.push([sortBy, sortOrder === 'desc' ? 'DESC' : 'ASC']);
    } else {
      sorting.push(['updatedAt', 'DESC']);
    }
    
    const { count, rows } = await Stock.findAndCountAll({
      where: condition,
      limit,
      offset,
      order: sorting,
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'sku', 'categoryId']
        }
      ]
    });
    
    res.status(200).json({
      status: "success",
      data: rows,
      meta: {
        total: count,
        page: parseInt(page),
        size: parseInt(size),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Find one stock item by ID
exports.findOne = async (req, res, next) => {
  try {
    const id = req.params.id;
    
    const stock = await Stock.findByPk(id, {
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'sku', 'description', 'categoryId']
        }
      ]
    });
    
    if (!stock) {
      return res.status(404).json({
        status: "error",
        message: "Stock item not found"
      });
    }
    
    res.status(200).json({
      status: "success",
      data: stock
    });
  } catch (error) {
    next(error);
  }
};

// Create a new stock item
exports.create = async (req, res, next) => {
  try {
    const { productId, quantity, location, reorderThreshold, costPrice } = req.body;
    
    // Check if the product exists
    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(400).json({
        status: "error",
        message: "Product not found"
      });
    }
    
    // Check if stock already exists for this product
    const existingStock = await Stock.findOne({ where: { productId } });
    if (existingStock) {
      return res.status(400).json({
        status: "error",
        message: "Stock already exists for this product"
      });
    }
    
    // Create new stock
    const newStock = await Stock.create({
      productId,
      quantity,
      location,
      reorderThreshold,
      costPrice
    });
    
    // Create stock history entry
    await StockHistory.create({
      stockId: newStock.id,
      productId,
      previousQuantity: 0,
      newQuantity: quantity,
      type: 'INITIAL',
      reason: 'Initial stock entry',
      userId: req.userId
    });
    
    res.status(201).json({
      status: "success",
      message: "Stock created successfully",
      data: newStock
    });
  } catch (error) {
    next(error);
  }
};

// Update a stock item
exports.update = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { location, reorderThreshold, costPrice } = req.body;
    
    const stock = await Stock.findByPk(id);
    if (!stock) {
      return res.status(404).json({
        status: "error",
        message: "Stock item not found"
      });
    }
    
    const updatedStock = await stock.update({
      location,
      reorderThreshold,
      costPrice
    });
    
    res.status(200).json({
      status: "success",
      message: "Stock updated successfully",
      data: updatedStock
    });
  } catch (error) {
    next(error);
  }
};

// Delete a stock item
exports.delete = async (req, res, next) => {
  try {
    const id = req.params.id;
    
    const stock = await Stock.findByPk(id);
    if (!stock) {
      return res.status(404).json({
        status: "error",
        message: "Stock item not found"
      });
    }
    
    await stock.destroy();
    
    res.status(200).json({
      status: "success",
      message: "Stock deleted successfully"
    });
  } catch (error) {
    next(error);
  }
};

// Adjust stock quantity
exports.adjustStock = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { adjustment, reason } = req.body;
    
    if (!adjustment || isNaN(adjustment)) {
      return res.status(400).json({
        status: "error",
        message: "Valid adjustment value is required"
      });
    }
    
    const stock = await Stock.findByPk(id);
    if (!stock) {
      return res.status(404).json({
        status: "error",
        message: "Stock item not found"
      });
    }
    
    const previousQuantity = stock.quantity;
    const newQuantity = previousQuantity + parseInt(adjustment);
    
    if (newQuantity < 0) {
      return res.status(400).json({
        status: "error",
        message: "Adjustment would result in negative stock quantity"
      });
    }
    
    const adjustmentType = adjustment > 0 ? 'INCREASE' : 'DECREASE';
    
    await stock.update({ quantity: newQuantity });
    
    // Create stock history entry
    await StockHistory.create({
      stockId: stock.id,
      productId: stock.productId,
      previousQuantity,
      newQuantity,
      type: adjustmentType,
      reason: reason || `Stock ${adjustmentType.toLowerCase()} by ${Math.abs(adjustment)}`,
      userId: req.userId
    });
    
    res.status(200).json({
      status: "success",
      message: "Stock adjusted successfully",
      data: {
        id: stock.id,
        previousQuantity,
        newQuantity,
        adjustment
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get low stock items
exports.getLowStock = async (req, res, next) => {
  try {
    const lowStockItems = await Stock.findAll({
      where: {
        quantity: { [Op.lte]: db.sequelize.col('reorderThreshold') }
      },
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'sku', 'categoryId']
        }
      ]
    });
    
    res.status(200).json({
      status: "success",
      data: lowStockItems,
      count: lowStockItems.length
    });
  } catch (error) {
    next(error);
  }
};

// Get stock history
exports.getStockHistory = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { page = 1, size = 10 } = req.query;
    
    const limit = parseInt(size);
    const offset = (parseInt(page) - 1) * limit;
    
    const { count, rows } = await StockHistory.findAndCountAll({
      where: { stockId: id },
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: db.user,
          attributes: ['id', 'username']
        }
      ]
    });
    
    res.status(200).json({
      status: "success",
      data: rows,
      meta: {
        total: count,
        page: parseInt(page),
        size: parseInt(size),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Batch update stock items
exports.batchUpdate = async (req, res, next) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const { items } = req.body;
    
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Valid items array is required"
      });
    }
    
    const results = [];
    const errors = [];
    
    for (const item of items) {
      const { id, quantity, reason } = item;
      
      if (!id || isNaN(quantity)) {
        errors.push({ id, error: "Invalid id or quantity" });
        continue;
      }
      
      const stock = await Stock.findByPk(id, { transaction });
      if (!stock) {
        errors.push({ id, error: "Stock item not found" });
        continue;
      }
      
      const previousQuantity = stock.quantity;
      
      await stock.update({ quantity }, { transaction });
      
      await StockHistory.create({
        stockId: stock.id,
        productId: stock.productId,
        previousQuantity,
        newQuantity: quantity,
        type: 'BATCH_UPDATE',
        reason: reason || 'Batch stock update',
        userId: req.userId
      }, { transaction });
      
      results.push({
        id,
        previousQuantity,
        newQuantity: quantity
      });
    }
    
    await transaction.commit();
    
    res.status(200).json({
      status: "success",
      message: "Batch update completed",
      data: {
        results,
        errors,
        successCount: results.length,
        errorCount: errors.length
      }
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

// Export stock data
exports.exportStockData = async (req, res, next) => {
  try {
    const stocks = await Stock.findAll({
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'sku', 'description', 'categoryId']
        }
      ]
    });
    
    // Transform data for export
    const exportData = stocks.map(stock => ({
      productName: stock.product.name,
      sku: stock.product.sku,
      quantity: stock.quantity,
      location: stock.location,
      reorderThreshold: stock.reorderThreshold,
      costPrice: stock.costPrice,
      status: stock.quantity <= stock.reorderThreshold ? 'Low Stock' : 'In Stock',
      lastUpdated: stock.updatedAt
    }));
    
    res.status(200).json({
      status: "success",
      data: exportData
    });
  } catch (error) {
    next(error);
  }
};