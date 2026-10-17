const jwt = require("jsonwebtoken");
const Farmer = require("../models/Farmer");

const generateToken = (farmerId) => {
  return jwt.sign({ id: farmerId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

exports.registerFarmer = async (req, res, next) => {
  try {
    const { name, farmName, phone, email, password, avatarStyle } = req.body;

    const existingFarmer = await Farmer.findOne({ email });
    if (existingFarmer) {
      return res.status(400).json({ message: "Farmer already exists" });
    }

    const farmer = await Farmer.create({
      name,
      farmName,
      phone,
      email,
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
    const farmer = await Farmer.findOne({ email });

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
