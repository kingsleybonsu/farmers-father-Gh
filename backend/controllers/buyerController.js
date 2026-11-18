const jwt = require("jsonwebtoken");
const Buyer = require("../models/Buyer");

const generateBuyerToken = (buyerId) => {
  return jwt.sign({ id: buyerId, role: "buyer" }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

const normalizePhone = (phone) => {
  if (typeof phone !== "string") return null;

  const compactPhone = phone.trim().replace(/\s/g, "");
  if (/^0\d{9}$/.test(compactPhone)) {
    return `+233${compactPhone.slice(1)}`;
  }
  if (/^\+233\d{9}$/.test(compactPhone)) {
    return compactPhone;
  }
  return null;
};

const isValidName = (name) =>
  typeof name === "string" &&
  name.trim().length >= 2 &&
  name.trim().length <= 60;

exports.registerBuyer = async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body || {};
    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ message: "Name is required." });
    }
    if (typeof email !== "string" || !email.trim()) {
      return res.status(400).json({ message: "Email is required." });
    }
    if (typeof phone !== "string" || !phone.trim()) {
      return res.status(400).json({ message: "Phone is required." });
    }
    if (typeof password !== "string" || !password) {
      return res.status(400).json({ message: "Password is required." });
    }
    if (!isValidName(name)) {
      return res
        .status(400)
        .json({ message: "Name must be between 2 and 60 characters." });
    }
    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      return res
        .status(400)
        .json({ message: "Phone must be a valid Ghana number." });
    }

    const existingBuyer = await Buyer.findOne({ email: normalizedEmail });
    if (existingBuyer) {
      return res
        .status(400)
        .json({ message: "An account with this email already exists" });
    }

    const buyer = await Buyer.create({
      name: name.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      password,
    });

    res.status(201).json({
      token: generateBuyerToken(buyer._id),
      buyer: {
        name: buyer.name,
        email: buyer.email,
        phone: buyer.phone,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ message: "An account with this email already exists" });
    }
    next(error);
  }
};

exports.loginBuyer = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (typeof email !== "string" || !email.trim()) {
      return res.status(400).json({ message: "Email is required." });
    }
    if (typeof password !== "string" || !password) {
      return res.status(400).json({ message: "Password is required." });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const buyer = await Buyer.findOne({ email: normalizedEmail });
    if (!buyer || !(await buyer.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    res.json({
      token: generateBuyerToken(buyer._id),
      buyer: {
        name: buyer.name,
        email: buyer.email,
        phone: buyer.phone,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getCurrentBuyer = async (req, res, next) => {
  try {
    const buyer = await Buyer.findById(req.buyer._id).select("-password");
    if (!buyer) {
      return res.status(404).json({ message: "Buyer not found." });
    }

    res.json({ buyer });
  } catch (error) {
    next(error);
  }
};

exports.updateCurrentBuyer = async (req, res, next) => {
  try {
    const buyer = await Buyer.findById(req.buyer._id);
    if (!buyer) {
      return res.status(404).json({ message: "Buyer not found." });
    }

    const providedFields = req.body || {};
    if (Object.prototype.hasOwnProperty.call(providedFields, "name")) {
      if (!isValidName(providedFields.name)) {
        return res
          .status(400)
          .json({ message: "Name must be between 2 and 60 characters." });
      }
      buyer.name = providedFields.name.trim();
    }
    if (Object.prototype.hasOwnProperty.call(providedFields, "phone")) {
      const normalizedPhone = normalizePhone(providedFields.phone);
      if (!normalizedPhone) {
        return res
          .status(400)
          .json({ message: "Phone must be a valid Ghana number." });
      }
      buyer.phone = normalizedPhone;
    }

    await buyer.save();
    const safeBuyer = await Buyer.findById(buyer._id).select("-password");
    res.json({ buyer: safeBuyer });
  } catch (error) {
    next(error);
  }
};

exports.updateBuyerPassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (
      typeof currentPassword !== "string" ||
      !currentPassword ||
      typeof newPassword !== "string" ||
      !newPassword
    ) {
      return res.status(400).json({
        message: "Current password and new password are required.",
      });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({
        message: "New password must be at least 8 characters long.",
      });
    }

    const buyer = await Buyer.findById(req.buyer._id);
    if (!buyer || !(await buyer.matchPassword(currentPassword))) {
      return res
        .status(400)
        .json({ message: "Current password is incorrect." });
    }

    buyer.password = newPassword;
    await buyer.save();
    res.json({ message: "Password updated successfully." });
  } catch (error) {
    next(error);
  }
};
