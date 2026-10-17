const express = require("express");
const {
  createProduce,
  getAllProduce,
  getProduceSuggestions,
  getFarmerProduce,
  getMyProduce,
  updateProduce,
  deleteProduce,
} = require("../controllers/produceController");
const { protect } = require("../middleware/authMiddleware");
const { produceImageUpload } = require("../middleware/produceImageUpload");

const router = express.Router();

router.get("/", getAllProduce);
router.get("/suggestions", getProduceSuggestions);
router.get("/mine", protect, getMyProduce);
router.get("/farmers/:farmerId", getFarmerProduce);
router.post("/", protect, produceImageUpload, createProduce);
router.put("/:id", protect, produceImageUpload, updateProduce);
router.delete("/:id", protect, deleteProduce);

module.exports = router;
