const express = require("express");
const {
  createOrders,
  getBuyerOrders,
  cancelBuyerOrder,
  getFarmerOrders,
  updateFarmerOrderStatus,
} = require("../controllers/orderController");
const { protect, protectBuyer } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", protectBuyer, createOrders);
router.get("/buyer", protectBuyer, getBuyerOrders);
router.put("/:id/cancel", protectBuyer, cancelBuyerOrder);
router.get("/farmer", protect, getFarmerOrders);
router.put("/:id/status", protect, updateFarmerOrderStatus);

module.exports = router;
