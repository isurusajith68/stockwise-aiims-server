module.exports = (sequelize, Sequelize) => {
  const Information = sequelize.define(
    "store-information",
    {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
      },
      storeName: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      storePhone: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      storeAddress: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
    },
    {
      timestamps: true,
    }
  );

  return Information;
};
