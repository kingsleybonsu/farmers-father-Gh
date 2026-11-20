const crypto = require("crypto");
const mongoose = require("mongoose");
const Order = require("../models/Order");
const Produce = require("../models/Produce");

const ORDERS_PER_PAGE = 10;
const ORDER_STATUSES = ["pending", "accepted", "declined", "cancelled"];

const getPagination = (value) =>
  Math.max(1, Number.parseInt(value, 10) || 1);

const getStatusFilter = (status) => {
  if (status === undefined) return { filter: {}, error: null };
  if (!ORDER_STATUSES.includes(status)) {
    return {
      filter: null,
      error: "Status must be pending, accepted, declined, or cancelled.",
    };
  }
  return { filter: { status }, error: null };
};

const getOwnedOrder = async (filter, res) => {
  const order = await Order.findOne(filter);
  if (order) return order;

  res.status(404).json({ message: "Order not found." });
  return null;
};

const rollbackStock = async (reducedItems) => {
  for (const item of reducedItems) {
    const restoredProduce = await Produce.findOneAndUpdate(
      { _id: item.produceId },
      { $inc: { quantity: item.quantity } },
      { new: true },
    );
    if (!restoredProduce) {
      throw new Error(`Unable to restore stock for ${item.name}.`);
    }

    if (restoredProduce.quantity > 0) {
      await Produce.updateOne(
        {
          _id: item.produceId,
          status: "sold_out",
          quantity: { $gt: 0 },
        },
        { $set: { status: "available" } },
      );
    }
  }
};

exports.createOrders = async (req, res, next) => {
  try {
    const { fulfilment = "pickup", pickupArea, note = "", items } =
      req.body || {};
    if (!["pickup", "delivery"].includes(fulfilment)) {
      return res
        .status(400)
        .json({ message: "Fulfilment must be pickup or delivery." });
    }
    if (typeof pickupArea !== "string" || !pickupArea.trim()) {
      return res.status(400).json({ message: "Pickup area is required." });
    }
    if (pickupArea.trim().length > 80) {
      return res
        .status(400)
        .json({ message: "Pickup area must be 80 characters or fewer." });
    }
    if (typeof note !== "string") {
      return res.status(400).json({ message: "Note must be text." });
    }
    if (note.trim().length > 300) {
      return res
        .status(400)
        .json({ message: "Note must be 300 characters or fewer." });
    }
    if (!Array.isArray(items) || items.length < 1 || items.length > 20) {
      return res
        .status(400)
        .json({ message: "An order must contain between 1 and 20 items." });
    }

    const requestedItems = new Map();
    for (const item of items) {
      if (
        !item ||
        typeof item.produceId !== "string" ||
        !mongoose.Types.ObjectId.isValid(item.produceId)
      ) {
        return res
          .status(400)
          .json({ message: "Each item must have a valid produceId." });
      }
      if (
        typeof item.quantity !== "number" ||
        !Number.isFinite(item.quantity) ||
        item.quantity <= 0
      ) {
        return res
          .status(400)
          .json({ message: "Each item quantity must be a number above zero." });
      }

      const produceId = new mongoose.Types.ObjectId(item.produceId).toString();
      const requested = requestedItems.get(produceId) || {
        produceId,
        quantity: 0,
      };
      requested.quantity += item.quantity;
      requestedItems.set(produceId, requested);
    }

    const pendingOrders = await Order.countDocuments({
      buyer: req.buyer._id,
      status: "pending",
    });
    if (pendingOrders >= 10) {
      return res.status(429).json({
        message:
          "You have too many pending orders. Please wait for farmers to respond before placing more.",
      });
    }

    const produceListings = await Produce.find({
      _id: { $in: [...requestedItems.keys()] },
    }).lean();
    const produceById = new Map(
      produceListings.map((produce) => [produce._id.toString(), produce]),
    );
    const ordersByFarmer = new Map();

    for (const requested of requestedItems.values()) {
      const produce = produceById.get(requested.produceId);
      if (!produce) {
        return res
          .status(400)
          .json({
            message: `Produce item ${requested.produceId} was not found.`,
          });
      }
      if ((produce.status || "available") !== "available") {
        return res
          .status(400)
          .json({ message: `${produce.name} is not available.` });
      }
      if (requested.quantity > produce.quantity) {
        return res.status(400).json({
          message: `Requested quantity for ${produce.name} exceeds available stock.`,
        });
      }

      const farmerId = produce.farmer.toString();
      let farmerOrder = ordersByFarmer.get(farmerId);
      if (!farmerOrder) {
        farmerOrder = {
          farmer: produce.farmer,
          farmerName: produce.farmerName,
          farmName: produce.farmName,
          items: [],
          total: 0,
        };
        ordersByFarmer.set(farmerId, farmerOrder);
      }

      const lineTotal = produce.price * requested.quantity;
      farmerOrder.items.push({
        produce: produce._id,
        name: produce.name,
        unit: produce.unit,
        unitPrice: produce.price,
        quantity: requested.quantity,
        lineTotal,
      });
      farmerOrder.total += lineTotal;
    }

    const checkoutGroupId = crypto.randomUUID();
    const orderDocuments = [...ordersByFarmer.values()].map((farmerOrder) => ({
      checkoutGroupId,
      buyer: req.buyer._id,
      buyerName: req.buyer.name,
      buyerPhone: req.buyer.phone,
      farmer: farmerOrder.farmer,
      farmerName: farmerOrder.farmerName,
      farmName: farmerOrder.farmName,
      fulfilment,
      pickupArea: pickupArea.trim(),
      note: note.trim(),
      items: farmerOrder.items,
      total: farmerOrder.total,
    }));

    let createdOrders;
    try {
      createdOrders = await Order.insertMany(orderDocuments);
    } catch (error) {
      try {
        await Order.deleteMany({ checkoutGroupId });
      } catch (cleanupError) {
        return next(cleanupError);
      }
      throw error;
    }

    res.status(201).json({
      checkoutGroupId,
      orders: createdOrders.map((order) => ({
        _id: order._id,
        farmName: order.farmName,
        total: order.total,
        status: order.status,
        items: order.items,
      })),
    });
  } catch (error) {
    next(error);
  }
};

exports.getBuyerOrders = async (req, res, next) => {
  try {
    const { filter, error } = getStatusFilter(req.query.status);
    if (error) return res.status(400).json({ message: error });

    const page = getPagination(req.query.page);
    const query = { buyer: req.buyer._id, ...filter };
    const [orders, totalOrders] = await Promise.all([
      Order.find(query)
        .select(
          "checkoutGroupId farmer farmName pickupArea note items total status declineReason fulfilment createdAt",
        )
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * ORDERS_PER_PAGE)
        .limit(ORDERS_PER_PAGE)
        .lean(),
      Order.countDocuments(query),
    ]);

    res.json({
      orders: orders.map((order) => ({
        _id: order._id,
        checkoutGroupId: order.checkoutGroupId,
        farmerId: order.farmer.toString(),
        farmName: order.farmName,
        pickupArea: order.pickupArea,
        note: order.note,
        items: order.items,
        total: order.total,
        status: order.status,
        declineReason: order.declineReason,
        fulfilment: order.fulfilment,
        createdAt: order.createdAt,
      })),
      page,
      pageSize: ORDERS_PER_PAGE,
      totalOrders,
      hasMore: page * ORDERS_PER_PAGE < totalOrders,
    });
  } catch (error) {
    next(error);
  }
};

exports.cancelBuyerOrder = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid order id." });
    }

    const order = await getOwnedOrder(
      { _id: req.params.id, buyer: req.buyer._id },
      res,
    );
    if (!order) return;
    if (order.status !== "pending") {
      return res
        .status(409)
        .json({ message: "Only pending orders can be cancelled." });
    }

    const cancelledOrder = await Order.findOneAndUpdate(
      { _id: order._id, buyer: req.buyer._id, status: "pending" },
      { $set: { status: "cancelled" } },
      { new: true },
    );
    if (!cancelledOrder) {
      return res
        .status(409)
        .json({ message: "Only pending orders can be cancelled." });
    }

    res.json({
      message: "Order cancelled successfully.",
      order: {
        _id: cancelledOrder._id,
        farmName: cancelledOrder.farmName,
        total: cancelledOrder.total,
        status: cancelledOrder.status,
        items: cancelledOrder.items,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getFarmerOrders = async (req, res, next) => {
  try {
    const { filter, error } = getStatusFilter(req.query.status);
    if (error) return res.status(400).json({ message: error });

    const page = getPagination(req.query.page);
    const query = { farmer: req.farmer._id, ...filter };
    const [orders, totalOrders] = await Promise.all([
      Order.find(query)
        .select(
          "checkoutGroupId buyerName buyerPhone pickupArea note items total status declineReason fulfilment createdAt",
        )
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * ORDERS_PER_PAGE)
        .limit(ORDERS_PER_PAGE)
        .lean(),
      Order.countDocuments(query),
    ]);

    res.json({
      orders,
      page,
      pageSize: ORDERS_PER_PAGE,
      totalOrders,
      hasMore: page * ORDERS_PER_PAGE < totalOrders,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateFarmerOrderStatus = async (req, res, next) => {
  try {
    const { status, declineReason = "" } = req.body || {};
    if (!["accepted", "declined"].includes(status)) {
      return res
        .status(400)
        .json({ message: "Status must be accepted or declined." });
    }
    if (
      typeof declineReason !== "string" ||
      declineReason.trim().length > 200
    ) {
      return res
        .status(400)
        .json({
          message: "Decline reason must be text of 200 characters or fewer.",
        });
    }
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid order id." });
    }

    const order = await getOwnedOrder(
      { _id: req.params.id, farmer: req.farmer._id },
      res,
    );
    if (!order) return;
    if (order.status !== "pending") {
      return res
        .status(409)
        .json({ message: "Only pending orders can be updated." });
    }

    if (status === "declined") {
      const declinedOrder = await Order.findOneAndUpdate(
        { _id: order._id, farmer: req.farmer._id, status: "pending" },
        { $set: { status: "declined", declineReason: declineReason.trim() } },
        { new: true },
      );
      if (!declinedOrder) {
        return res
          .status(409)
          .json({ message: "Only pending orders can be updated." });
      }

      return res.json({
        message: "Order declined successfully.",
        order: {
          _id: declinedOrder._id,
          status: declinedOrder.status,
          declineReason: declinedOrder.declineReason,
        },
      });
    }

    const acceptedOrder = await Order.findOneAndUpdate(
      { _id: order._id, farmer: req.farmer._id, status: "pending" },
      { $set: { status: "accepted", declineReason: "" } },
      { new: true },
    );
    if (!acceptedOrder) {
      return res
        .status(409)
        .json({ message: "Only pending orders can be updated." });
    }

    const reducedItems = [];
    try {
      for (const item of acceptedOrder.items) {
        const updatedProduce = await Produce.findOneAndUpdate(
          {
            _id: item.produce,
            quantity: { $gte: item.quantity },
            $or: [
              { status: "available" },
              { status: { $exists: false } },
            ],
          },
          { $inc: { quantity: -item.quantity } },
          { new: true },
        );
        if (!updatedProduce) {
          const error = new Error(`Not enough stock for ${item.name}`);
          error.stockConflict = true;
          throw error;
        }

        reducedItems.push({
          produceId: item.produce,
          quantity: item.quantity,
          name: item.name,
        });

        if (updatedProduce.quantity === 0) {
          await Produce.updateOne(
            { _id: item.produce, quantity: 0 },
            { $set: { status: "sold_out" } },
          );
        }
      }
    } catch (error) {
      try {
        await rollbackStock(reducedItems);
        const resetOrder = await Order.updateOne(
          { _id: acceptedOrder._id, status: "accepted" },
          { $set: { status: "pending" } },
        );
        if (resetOrder.modifiedCount !== 1) {
          throw new Error("Unable to restore order status after stock failure.");
        }
      } catch (rollbackError) {
        return next(rollbackError);
      }

      if (error.stockConflict) {
        return res.status(409).json({ message: error.message });
      }
      return next(error);
    }

    res.json({
      message: "Order accepted successfully.",
      order: {
        _id: acceptedOrder._id,
        status: acceptedOrder.status,
        total: acceptedOrder.total,
        items: acceptedOrder.items,
      },
    });
  } catch (error) {
    next(error);
  }
};
