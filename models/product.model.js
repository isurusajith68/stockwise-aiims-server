module.exports = (sequelize, Sequelize) => {
  const Product = sequelize.define("product", {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    description: {
      type: Sequelize.TEXT,
    },
    category: {
      type: Sequelize.STRING,
    },
    price: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
    },
    quantity: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    sku: {
      type: Sequelize.STRING,
      unique: true,
    },
    imageUrl: {
      type: Sequelize.STRING,
    },
    isActive: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
    },
  });

  return Product;
};
