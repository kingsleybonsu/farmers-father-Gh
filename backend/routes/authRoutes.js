const express = require("express");
const {
  registerFarmer,
  loginFarmer,
  getCurrentFarmer,
  updateCurrentFarmer,
  updateFarmerPassword,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", registerFarmer);
router.post("/login", loginFarmer);
router.get("/me", protect, getCurrentFarmer);
router.put("/me", protect, updateCurrentFarmer);
router.put("/password", protect, updateFarmerPassword);

module.exports = router;
