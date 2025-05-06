const Joi = require("joi");

// Validate registration data
exports.validateRegistration = (req, res, next) => {
  const schema = Joi.object({
    username: Joi.string().min(3).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid("user", "admin"),
  });

  const { error } = schema.validate(req.body);

  if (error) {
    return res.status(400).json({
      status: "error",
      message: error.details[0].message,
    });
  }

  next();
};

// Validate login data
exports.validateLogin = (req, res, next) => {
  const schema = Joi.object({
    username: Joi.string().required(),
    password: Joi.string().required(),
  });

  const { error } = schema.validate(req.body);

  if (error) {
    return res.status(400).json({
      status: "error",
      message: error.details[0].message,
    });
  }

  next();
};

// Validate user update data
exports.validateUserUpdate = (req, res, next) => {
  const schema = Joi.object({
    username: Joi.string().min(3).max(50),
    email: Joi.string().email(),
    password: Joi.string().min(6),
    role: Joi.string().valid("user", "admin"),
    isActive: Joi.boolean(),
  }).min(1); // At least one field required

  const { error } = schema.validate(req.body);

  if (error) {
    return res.status(400).json({
      status: "error",
      message: error.details[0].message,
    });
  }

  next();
};
