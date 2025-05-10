require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const { errorHandler } = require("./utils/errorHandler");

const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  message: {
    status: 429,
    message: "Too many requests, please try again later.",
  },
});


app.use("/api", apiLimiter);

const db = require("./models");
db.sequelize
  .sync()
  .then(() => {
    console.log("Database synchronized");
  })
  .catch((err) => {
    console.error("Failed to sync database:", err);
  });

app.get("/", (req, res) => {
  res.json({
    message: "STOCKWISE API",
    version: "1.0.0",
  });
});

require("./routes/auth.routes")(app);
require("./routes/user.routes")(app);

app.use((req, res, next) => {
  res.status(404).json({
    status: 404,
    message: "Resource not found",
  });
});

app.use(errorHandler);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});
