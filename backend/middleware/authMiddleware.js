const jwt = require("jsonwebtoken");
const Farmer = require("../models/Farmer");

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
