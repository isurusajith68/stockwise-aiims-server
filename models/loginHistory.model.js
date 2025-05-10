module.exports = (sequelize, Sequelize) => {
  const LoginHistory = sequelize.define(
    "login_history",
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
      ipAddress: {
        type: Sequelize.STRING,
      },
      deviceInfo: {
        type: Sequelize.STRING,
      },
      location: {
        type: Sequelize.STRING,
      },
      loginTime: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      status: {
        type: Sequelize.ENUM("success", "failed"),
        defaultValue: "success",
      },
      failureReason: {
        type: Sequelize.STRING,
      },
    },
    {
      timestamps: true,
    }
  );

  return LoginHistory;
};
