const jwt = require("jsonwebtoken");
const Farmer = require("../models/Farmer");
const Buyer = require("../models/Buyer");

exports.protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role && decoded.role !== "farmer") {
      return res
        .status(401)
        .json({ message: "Not authorized, wrong account type" });
    }

    const farmer = await Farmer.findById(decoded.id).select("-password");

    if (!farmer) {
      return res
        .status(401)
        .json({ message: "Not authorized, farmer not found" });
    }

    req.farmer = farmer;
    next();
  } catch (error) {
    res.status(401).json({ message: "Not authorized, token failed" });
  }
};

exports.protectBuyer = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "buyer") {
      return res
        .status(401)
        .json({ message: "Not authorized, wrong account type" });
    }

    const buyer = await Buyer.findById(decoded.id).select("-password");
    if (!buyer) {
      return res
        .status(401)
        .json({ message: "Not authorized, buyer not found" });
    }

    req.buyer = buyer;
    next();
  } catch (error) {
    res.status(401).json({ message: "Not authorized, token failed" });
  }
};
