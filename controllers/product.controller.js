const db = require("../models");
const Product = db.product;
const User = db.user;
const { Op } = db.Sequelize;

// Create a new product
exports.create = async (req, res) => {
  try {
    // Validate request
    if (!req.body.name || !req.body.price) {
      return res.status(400).json({
        status: 400,
        message: "Name and price are required fields",
      });
    }

    // Create product object
    const product = {
      name: req.body.name,
      description: req.body.description,
      category: req.body.category,
      price: req.body.price,
      quantity: req.body.quantity || 0,
      sku: req.body.sku,
      imageUrl: req.body.imageUrl,
      isActive: req.body.isActive !== undefined ? req.body.isActive : true,
      userId: req.userId, // From JWT middleware
    };

    // Save product in the database
    const data = await Product.create(product);
    res.status(201).json({
      status: 201,
      message: "Product created successfully",
      data: data,
    });
  } catch (err) {
    res.status(500).json({
      status: 500,
      message: err.message || "Some error occurred while creating the product.",
    });
  }
};

// Retrieve all products for a user
exports.findAll = async (req, res) => {
  try {
    const { name, category, isActive } = req.query;
    const condition = { userId: req.userId };

    // Add filters if provided
    if (name) {
      condition.name = { [Op.like]: `%${name}%` };
    }
    if (category) {
      condition.category = category;
    }
    if (isActive !== undefined) {
      condition.isActive = isActive === 'true';
    }

    const data = await Product.findAll({ where: condition });
    res.json({
      status: 200,
      message: "Products retrieved successfully",
      data: data,
    });
  } catch (err) {
    res.status(500).json({
      status: 500,
      message: err.message || "Some error occurred while retrieving products.",
    });
  }
};

// Find a single product by id
exports.findOne = async (req, res) => {
  try {
    const id = req.params.id;
    
    const data = await Product.findOne({
      where: {
        id: id,
        userId: req.userId,
      },
    });
    
    if (data) {
      res.json({
        status: 200,
        message: "Product retrieved successfully",
        data: data,
      });
    } else {
      res.status(404).json({
        status: 404,
        message: `Product with id=${id} not found or you don't have access to it.`,
      });
    }
  } catch (err) {
    res.status(500).json({
      status: 500,
      message: `Error retrieving product with id=${req.params.id}`,
    });
  }
};

// Update a product
exports.update = async (req, res) => {
  try {
    const id = req.params.id;
    
    const [num] = await Product.update(req.body, {
      where: { 
        id: id,
        userId: req.userId 
      },
    });
    
    if (num === 1) {
      res.json({
        status: 200,
        message: "Product was updated successfully.",
      });
    } else {
      res.status(404).json({
        status: 404,
        message: `Cannot update product with id=${id}. Product was not found or you don't have access to it.`,
      });
    }
  } catch (err) {
    res.status(500).json({
      status: 500,
      message: `Error updating product with id=${req.params.id}`,
    });
  }
};

// Delete a product
exports.delete = async (req, res) => {
  try {
    const id = req.params.id;
    
    const num = await Product.destroy({
      where: { 
        id: id,
        userId: req.userId 
      },
    });
    
    if (num === 1) {
      res.json({
        status: 200,
        message: "Product was deleted successfully!",
      });
    } else {
      res.status(404).json({
        status: 404,
        message: `Cannot delete product with id=${id}. Product was not found or you don't have access to it.`,
      });
    }
  } catch (err) {
    res.status(500).json({
      status: 500,
      message: `Error deleting product with id=${req.params.id}`,
    });
  }
};

// Get low stock products (quantity below threshold)
exports.getLowStock = async (req, res) => {
  try {
    const threshold = req.query.threshold || 10; // Default threshold is 10
    
    const data = await Product.findAll({
      where: {
        userId: req.userId,
        quantity: { [Op.lt]: threshold },
        isActive: true,
      },
    });
    
    res.json({
      status: 200,
      message: "Low stock products retrieved successfully",
      data: data,
    });
  } catch (err) {
    res.status(500).json({
      status: 500,
      message: err.message || "Some error occurred while retrieving low stock products.",
    });
  }
};
