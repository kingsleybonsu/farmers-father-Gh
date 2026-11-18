const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    produce: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Produce",
      required: true,
    },
    name: { type: String, required: true, trim: true },
    unit: { type: String, required: true, trim: true },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: {
      type: Number,
      required: true,
      validate: {
        validator: (value) => value > 0,
        message: "Item quantity must be greater than zero.",
      },
    },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    checkoutGroupId: { type: String, required: true },
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Buyer",
      required: true,
    },
    buyerName: { type: String, required: true, trim: true },
    buyerPhone: { type: String, required: true, trim: true },
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Farmer",
      required: true,
    },
    farmerName: { type: String, required: true, trim: true },
    farmName: { type: String, required: true, trim: true },
    fulfilment: {
      type: String,
      enum: ["pickup", "delivery"],
      default: "pickup",
    },
    pickupArea: { type: String, required: true, trim: true, maxlength: 80 },
    note: { type: String, trim: true, maxlength: 300, default: "" },
    items: {
      type: [orderItemSchema],
      validate: [
        {
          validator: (items) => items.length >= 1,
          message: "An order must contain at least one item.",
        },
        {
          validator: (items) => items.length <= 20,
          message: "An order cannot contain more than 20 items.",
        },
      ],
    },
    total: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "cancelled"],
      default: "pending",
    },
    declineReason: { type: String, trim: true, maxlength: 200, default: "" },
    paymentMethod: {
      type: String,
      enum: ["pay_on_delivery"],
      default: "pay_on_delivery",
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid"],
      default: "unpaid",
    },
  },
  { timestamps: true },
);

orderSchema.index({ farmer: 1, status: 1, createdAt: -1 });
orderSchema.index({ buyer: 1, createdAt: -1 });

module.exports = mongoose.model("Order", orderSchema);
