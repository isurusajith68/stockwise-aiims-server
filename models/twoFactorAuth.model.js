module.exports = (sequelize, Sequelize) => {
  const TwoFactorAuth = sequelize.define(
    "two_factor_auth",
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
      secret: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      isEnabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      backupCodes: {
        type: Sequelize.JSON,
        defaultValue: [],
      },
    },
    {
      timestamps: true,
    }
  );

  return TwoFactorAuth;
};
