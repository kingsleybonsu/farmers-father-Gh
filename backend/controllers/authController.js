const jwt = require("jsonwebtoken");
const Farmer = require("../models/Farmer");
const Produce = require("../models/Produce");

const generateToken = (farmerId) => {
  return jwt.sign({ id: farmerId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

exports.registerFarmer = async (req, res, next) => {
  try {
    const { name, farmName, phone, email, password, avatarStyle } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    const existingFarmer = await Farmer.findOne({ email: normalizedEmail });
    if (existingFarmer) {
      return res.status(400).json({ message: "Farmer already exists" });
    }

    const farmer = await Farmer.create({
      name,
      farmName,
      phone,
      email: normalizedEmail,
      password,
      avatarStyle: avatarStyle || "neutral",
    });

    res.status(201).json({
      token: generateToken(farmer._id),
      farmer: {
        name: farmer.name,
        email: farmer.email,
        avatarStyle: farmer.avatarStyle,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.loginFarmer = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.trim().toLowerCase();
    const farmer = await Farmer.findOne({ email: normalizedEmail });

    if (!farmer || !(await farmer.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    res.json({
      token: generateToken(farmer._id),
      farmer: {
        name: farmer.name,
        email: farmer.email,
        avatarStyle: farmer.avatarStyle,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getCurrentFarmer = async (req, res, next) => {
  try {
    const farmer = await Farmer.findById(req.farmer._id).select("-password");
    if (!farmer) {
      return res.status(404).json({ message: "Farmer not found." });
    }

    res.json({ farmer });
  } catch (error) {
    next(error);
  }
};

exports.updateCurrentFarmer = async (req, res, next) => {
  try {
    const farmer = await Farmer.findById(req.farmer._id);
    if (!farmer) {
      return res.status(404).json({ message: "Farmer not found." });
    }

    const allowedFields = [
      "name",
      "farmName",
      "phone",
      "avatarStyle",
      "location",
    ];
    const providedFields = req.body || {};
    const updatedFields = allowedFields.filter((field) =>
      Object.prototype.hasOwnProperty.call(providedFields, field),
    );
    updatedFields.forEach((field) => {
      farmer[field] = providedFields[field];
    });

    await farmer.save();

    const produceUpdates = {};
    if (updatedFields.includes("name")) produceUpdates.farmerName = farmer.name;
    if (updatedFields.includes("farmName"))
      produceUpdates.farmName = farmer.farmName;
    if (updatedFields.includes("avatarStyle"))
      produceUpdates.avatarStyle = farmer.avatarStyle;

    if (Object.keys(produceUpdates).length) {
      await Produce.updateMany(
        { farmer: farmer._id },
        { $set: produceUpdates },
      );
    }

    const safeFarmer = await Farmer.findById(farmer._id).select("-password");
    res.json({ farmer: safeFarmer });
  } catch (error) {
    next(error);
  }
};

exports.updateFarmerPassword = async (req, res, next) => {
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

    const farmer = await Farmer.findById(req.farmer._id);
    if (!farmer || !(await farmer.matchPassword(currentPassword))) {
      return res
        .status(400)
        .json({ message: "Current password is incorrect." });
    }

    farmer.password = newPassword;
    await farmer.save();
    res.json({ message: "Password updated successfully." });
  } catch (error) {
    next(error);
  }
};
