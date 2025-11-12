const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { sequelize } = require("./models");
const authRoutes = require("./routes/auth");
const schoolRoutes = require("./routes/school");
const examScoreRoutes = require("./routes/examScoreRoutes");
const analyzeRoutes = require('./routes/analyzeroutes');

dotenv.config();

const app = express();
app.use(express.json());

const cookieParser = require("cookie-parser");
app.use(cookieParser());

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

app.use("/auth", authRoutes);
app.use("/api/schools", schoolRoutes);
app.use("/api/exam-scores", examScoreRoutes);
app.use('/api/analyze', analyzeRoutes);

(async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected with Sequelize");

    await sequelize.sync({ alter: true });
    console.log("✅ All models synced");

    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Database connection failed:", err);
  }
})();
