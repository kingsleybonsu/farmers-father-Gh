const mongoose = require("mongoose");

const produceSchema = new mongoose.Schema(
  {
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Farmer",
      required: true,
    },
    farmerName: { type: String, required: true },
    farmName: { type: String, required: true },
    avatarStyle: { type: String, default: "neutral" },
    name: { type: String, required: true },
    category: {
      type: String,
      required: true,
      enum: ["Fruits", "Vegetables", "Grains", "Tubers", "Livestock"],
    },
    quantity: { type: Number, required: true },
    unit: {
      type: String,
      required: true,
      trim: true,
      default: "unit",
      maxlength: 30,
    },
    price: { type: Number, required: true },
    location: { type: String, required: true },
    imageUrl: { type: String, default: "" },
    imagePublicId: { type: String, default: "" },
  },
  { timestamps: true },
);

produceSchema.index(
  { farmerName: "text", farmName: "text", name: "text", location: "text" },
  { name: "marketplace_search_text" },
);
produceSchema.index(
  { name: 1 },
  {
    name: "marketplace_produce_prefix",
    collation: { locale: "en", strength: 2 },
  },
);
produceSchema.index(
  { farmerName: 1 },
  {
    name: "marketplace_farmer_prefix",
    collation: { locale: "en", strength: 2 },
  },
);
produceSchema.index(
  { farmName: 1 },
  { name: "marketplace_farm_prefix", collation: { locale: "en", strength: 2 } },
);
produceSchema.index(
  { location: 1 },
  {
    name: "marketplace_location_prefix",
    collation: { locale: "en", strength: 2 },
  },
);
produceSchema.index({ farmer: 1, createdAt: -1 });

module.exports = mongoose.model("Produce", produceSchema);
