const express = require("express");
const rateLimit = require("express-rate-limit");
const {
  registerBuyer,
  loginBuyer,
  getCurrentBuyer,
  updateCurrentBuyer,
  updateBuyerPassword,
} = require("../controllers/buyerController");
const { protectBuyer } = require("../middleware/authMiddleware");

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many attempts from this IP. Please try again after 15 minutes.",
  },
});

router.post("/register", authLimiter, registerBuyer);
router.post("/login", authLimiter, loginBuyer);
router.get("/me", protectBuyer, getCurrentBuyer);
router.put("/me", protectBuyer, updateCurrentBuyer);
router.put("/password", protectBuyer, updateBuyerPassword);

module.exports = router;
