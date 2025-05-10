const { Sequelize } = require("sequelize");

exports.errorHandler = (err, req, res, next) => {
  console.error("Error:", err);

  let statusCode = 500;
  let message = "Internal server error";
  let errors = null;

  if (err instanceof Sequelize.ValidationError) {
    statusCode = 400;
    message = "Validation error";
    errors = err.errors.map((e) => ({
      field: e.path,
      message: e.message,
    }));
  } else if (err instanceof Sequelize.UniqueConstraintError) {
    statusCode = 409;
    message = "Conflict error";
    errors = err.errors.map((e) => ({
      field: e.path,
      message: e.message,
    }));
  } else if (err instanceof Sequelize.DatabaseError) {
    statusCode = 500;
    message = "Database error";
  }

  return res.status(statusCode).json({
    status: "error",
    message,
    errors,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
};
