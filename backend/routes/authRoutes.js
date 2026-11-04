const express = require("express");
const rateLimit = require("express-rate-limit");
const {
  registerFarmer,
  loginFarmer,
  getCurrentFarmer,
  updateCurrentFarmer,
  updateFarmerPassword,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Generous limit for mobile/desktop testing
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many attempts from this IP. Please try again after 15 minutes.",
  },
});

router.post("/register", authLimiter, registerFarmer);
router.post("/login", authLimiter, loginFarmer);
router.get("/me", protect, getCurrentFarmer);
router.put("/me", protect, updateCurrentFarmer);
router.put("/password", protect, updateFarmerPassword);

module.exports = router;
