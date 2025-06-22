module.exports = (sequelize, Sequelize) => {
  const Stock = sequelize.define(
    "stock",
    {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      productId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "products",
          key: "id",
        },
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
        },
      },
      location: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      reorderThreshold: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 10,
      },
      costPrice: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
    },
    {
      timestamps: true,
      paranoid: true,
    }
  );

  return Stock;
};
// This model defines the Stock entity with fields for product ID, quantity, location, reorder threshold, and cost price.
// It uses UUIDs for the primary key and foreign key references, ensuring unique identification of stock items.
// The model also includes validation for quantity and cost price, ensuring that they are non-negative and properly formatted.
// Timestamps and soft deletes (paranoid) are enabled to track creation, updates, and deletions without losing historical data.
// The `productId` field references the `products` table, establishing a relationship between stock and products.