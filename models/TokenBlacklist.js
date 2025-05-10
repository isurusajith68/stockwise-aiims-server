module.exports = (sequelize, Sequelize) => {
  const TokenBlacklist = sequelize.define(
    "token_blacklist",
    {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      token: {
        type: Sequelize.TEXT,
        allowNull: false,
        unique: true,
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
      },
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
    },
    {
      timestamps: true,
      updatedAt: false, // We don't need updatedAt for blacklisted tokens
      indexes: [
        {
          name: "token_blacklist_token_idx",
          fields: ["token"],
        },
        {
          name: "token_blacklist_expires_idx",
          fields: ["expiresAt"],
        },
      ],
    }
  );

  TokenBlacklist.cleanup = async function () {
    const now = new Date();
    return this.destroy({
      where: {
        expiresAt: {
          [Sequelize.Op.lt]: now,
        },
      },
    });
  };

  return TokenBlacklist;
};
