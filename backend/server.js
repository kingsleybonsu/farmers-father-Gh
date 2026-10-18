// 1. Force the Node.js process to use Google's Public DNS servers.
// This forces your mobile hotspot to resolve MongoDB's SRV/TXT records safely.
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const authRoutes = require("./routes/authRoutes");
const produceRoutes = require("./routes/produceRoutes");

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/produce", produceRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  let status = Number(err.statusCode || err.status) || 500;
  let message = err.message || "Request failed.";

  if (err.name === "ValidationError") {
    status = 400;
    message = "Please check your input and try again.";
  } else if (err.code === 11000) {
    status = 400;
    message = "A record with these details already exists.";
  }

  if (status >= 500) {
    console.error("Unhandled server error:", err);
    return res.status(500).json({
      message: "Something went wrong. Please try again in a moment.",
    });
  }

  res.status(status).json({ message });
});

// Environment Configuration
const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error(
    "Missing database environment variable. Please set MONGO_URI in your .env file.",
  );
  process.exit(1);
}

// Single, clean database connection
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully!");
    app.listen(PORT, () => {
      console.log(`📡 Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error(" MongoDB connection error:", error.message || error);
    process.exit(1);
  });
