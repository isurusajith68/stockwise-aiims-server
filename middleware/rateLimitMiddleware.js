const rateLimit = require("express-rate-limit");
const RedisStore = require("rate-limit-redis");
const redis = require("redis");

const redisClient = process.env.REDIS_URL
  ? redis.createClient({ url: process.env.REDIS_URL })
  : null;

exports.loginLimiter = rateLimit({
  store: redisClient
    ? new RedisStore({
        client: redisClient,
        prefix: "login_limit:",
        sendCommand: (...args) => redisClient.sendCommand(args),
      })
    : undefined,
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  message: {
    status: 429,
    message: "Too many login attempts. Please try again after 15 minutes.",
  },
  skipSuccessfulRequests: false,
});
exports.ipLoginFailureLimiter = rateLimit({
  store: redisClient
    ? new RedisStore({
        client: redisClient,
        prefix: "ip_login_fail:",
        sendCommand: (...args) => redisClient.sendCommand(args),
      })
    : undefined,
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  message: {
    status: 429,
    message:
      "Too many failed login attempts from this IP. Try again after 1 hour.",
  },
  skipSuccessfulRequests: true,
});

exports.usernameLoginFailureLimiter = (req, res, next) => {
  const username = req.body.username;

  if (!username) return next();

  const usernameLimiter = rateLimit({
    store: redisClient
      ? new RedisStore({
          client: redisClient,
          prefix: `username_login_fail:${username}:`,
          sendCommand: (...args) => redisClient.sendCommand(args),
        })
      : undefined,
    windowMs: 60 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    message: {
      status: 429,
      message:
        "Too many failed login attempts for this account. Try again after 1 hour or reset your password.",
    },
    skipSuccessfulRequests: true,
  });

  return usernameLimiter(req, res, next);
};
