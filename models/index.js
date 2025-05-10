const dbConfig = require("../config/db.config");
const Sequelize = require("sequelize");

const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
  host: dbConfig.HOST,
  port: dbConfig.PORT,
  dialect: dbConfig.dialect,
  pool: {
    max: dbConfig.pool.max,
    min: dbConfig.pool.min,
    acquire: dbConfig.pool.acquire,
    idle: dbConfig.pool.idle,
  },
  logging: process.env.NODE_ENV === "development" ? console.log : false,
});

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.user = require("./user.model")(sequelize, Sequelize);

db.twoFactorAuth = require("./twoFactorAuth.model.js")(sequelize, Sequelize);
db.user.hasOne(db.twoFactorAuth, { foreignKey: "userId" });
db.twoFactorAuth.belongsTo(db.user, { foreignKey: "userId" });

db.loginHistory = require("./loginHistory.model.js")(sequelize, Sequelize);
db.user.hasMany(db.loginHistory, { foreignKey: "userId" });
db.loginHistory.belongsTo(db.user, { foreignKey: "userId" });

db.tokenBlacklist = require("./TokenBlacklist.js")(sequelize, Sequelize);
db.user.hasMany(db.tokenBlacklist, { foreignKey: "userId" });
db.tokenBlacklist.belongsTo(db.user, { foreignKey: "userId" });

module.exports = db;
