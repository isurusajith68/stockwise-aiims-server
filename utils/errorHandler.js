const { Sequelize } = require("sequelize");

exports.errorHandler = (err, req, res, next) => {
  console.error("Error:", err);

  // Default error response
  let statusCode = 500;
  let message = "Internal server error";
  let errors = null;

  // Handle different types of errors
  if (err instanceof Sequelize.ValidationError) {
    // Sequelize validation errors
    statusCode = 400;
    message = "Validation error";
    errors = err.errors.map((e) => ({
      field: e.path,
      message: e.message,
    }));
  } else if (err instanceof Sequelize.UniqueConstraintError) {
    // Unique constraint errors
    statusCode = 409;
    message = "Conflict error";
    errors = err.errors.map((e) => ({
      field: e.path,
      message: e.message,
    }));
  } else if (err instanceof Sequelize.DatabaseError) {
    // General database errors
    statusCode = 500;
    message = "Database error";
  }

  // Send error response
  return res.status(statusCode).json({
    status: "error",
    message,
    errors,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
};
