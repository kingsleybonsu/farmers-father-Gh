const Produce = require("../models/Produce");
const Farmer = require("../models/Farmer");
const mongoose = require("mongoose");
const {
  cloudinary,
  isCloudinaryConfigured,
  uploadImageBuffer,
} = require("../config/cloudinary");

const FARMERS_PER_PAGE = 12;
const PRODUCE_PER_PAGE = 12;
const SUGGESTION_FIELDS = [
  { type: "produce", field: "name" },
  { type: "farmer", field: "farmerName" },
  { type: "farm", field: "farmName" },
  { type: "location", field: "location" },
];

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getImageFormat = (buffer) => {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  )
    return { format: "jpeg", mimeType: "image/jpeg" };

  if (
    buffer.length >= 8 &&
    buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  )
    return { format: "png", mimeType: "image/png" };

  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  )
    return { format: "webp", mimeType: "image/webp" };

  return null;
};

const removeCloudinaryImageIfUnreferenced = async (publicId, listingId) => {
  if (!publicId || !isCloudinaryConfigured()) return;

  try {
    const otherReference = await Produce.exists({
      imagePublicId: publicId,
      _id: { $ne: listingId },
    });
    if (!otherReference) {
      await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
    }
  } catch (error) {
    console.error("Unable to remove unreferenced Cloudinary image:", error);
  }
};

exports.createProduce = async (req, res, next) => {
  let uploadedImage;

  try {
    const { name, category, status, quantity, unit, price, location } =
      req.body;
    let imageUrl = "";
    let imagePublicId = "";

    if (req.file) {
      const imageFormat = getImageFormat(req.file.buffer);
      if (!imageFormat || imageFormat.mimeType !== req.file.mimetype) {
        const error = new Error(
          "The selected file is not a valid JPG, PNG, or WebP image.",
        );
        error.status = 400;
        throw error;
      }

      if (!isCloudinaryConfigured()) {
        const error = new Error("Cloudinary is not configured on the server.");
        error.status = 503;
        throw error;
      }

      uploadedImage = await uploadImageBuffer(req.file.buffer);
      imageUrl = uploadedImage.secure_url;
      imagePublicId = uploadedImage.public_id;
    }

    const produce = await Produce.create({
      farmer: req.farmer._id,
      farmerName: req.farmer.name,
      farmName: req.farmer.farmName,
      avatarStyle: req.farmer.avatarStyle || "neutral",
      name,
      category,
      status: status || "available",
      quantity,
      unit,
      price,
      location,
      imageUrl,
      imagePublicId,
    });

    res.status(201).json(produce);
  } catch (error) {
    if (uploadedImage?.public_id) {
      try {
        await cloudinary.uploader.destroy(uploadedImage.public_id, {
          resource_type: "image",
        });
      } catch (cleanupError) {
        console.error(
          "Unable to remove unlinked Cloudinary image:",
          cleanupError,
        );
      }
    }

    next(error);
  }
};

exports.getAllProduce = async (req, res, next) => {
  try {
    const { category, search = "" } = req.query;
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const match = {};

    if (
      category &&
      ["Fruits", "Vegetables", "Grains", "Tubers", "Livestock"].includes(
        category,
      )
    ) {
      match.category = category;
    }

    if (typeof search === "string" && search.trim()) {
      match.$text = { $search: search.trim().slice(0, 100) };
    }

    const [pageResult] = await Produce.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$farmer",
          latestListingAt: { $max: "$createdAt" },
        },
      },
      { $sort: { latestListingAt: -1, _id: 1 } },
      {
        $facet: {
          farmers: [
            { $skip: (page - 1) * FARMERS_PER_PAGE },
            { $limit: FARMERS_PER_PAGE },
          ],
          count: [{ $count: "totalFarmers" }],
        },
      },
    ]);

    const pageFarmerIds = pageResult.farmers.map(({ _id }) => _id);
    const farmerGroups = pageFarmerIds.length
      ? await Produce.aggregate([
          { $match: { ...match, farmer: { $in: pageFarmerIds } } },
          {
            $group: {
              _id: "$farmer",
              farmerName: { $first: "$farmerName" },
              farmName: { $first: "$farmName" },
              avatarStyle: { $first: "$avatarStyle" },
              items: {
                $topN: {
                  output: {
                    _id: "$_id",
                    name: "$name",
                    category: "$category",
                    status: "$status",
                    quantity: "$quantity",
                    unit: "$unit",
                    price: "$price",
                    location: "$location",
                    imageUrl: "$imageUrl",
                  },
                  sortBy: { createdAt: -1, _id: 1 },
                  n: 3,
                },
              },
              totalProduce: { $sum: 1 },
            },
          },
        ])
      : [];
    const farmerById = new Map(
      farmerGroups.map((group) => [
        group._id.toString(),
        {
          id: group._id.toString(),
          farmerName: group.farmerName,
          farmName: group.farmName,
          avatarStyle: group.avatarStyle || "neutral",
          items: group.items,
          totalProduce: group.totalProduce,
        },
      ]),
    );
    const farmers = pageFarmerIds
      .map((farmerId) => farmerById.get(farmerId.toString()))
      .filter(Boolean);
    const totalFarmers = pageResult.count[0]?.totalFarmers || 0;

    res.json({
      farmers,
      page,
      pageSize: FARMERS_PER_PAGE,
      totalFarmers,
      hasMore: page * FARMERS_PER_PAGE < totalFarmers,
    });
  } catch (error) {
    next(error);
  }
};

exports.getProduceSuggestions = async (req, res, next) => {
  try {
    const query =
      typeof req.query.q === "string" ? req.query.q.trim().slice(0, 50) : "";
    if (query.length < 2) {
      return res.json({ suggestions: [] });
    }

    const match = {
      $or: SUGGESTION_FIELDS.map(({ field }) => ({
        [field]: { $gte: query, $lt: `${query}\uffff` },
      })),
    };
    const validCategories = [
      "Fruits",
      "Vegetables",
      "Grains",
      "Tubers",
      "Livestock",
    ];
    if (validCategories.includes(req.query.category)) {
      match.category = req.query.category;
    }

    const candidates = SUGGESTION_FIELDS.map(({ type, field }) => ({
      type,
      value: `$${field}`,
    }));
    const suggestions = await Produce.aggregate([
      { $match: match },
      {
        $project: {
          suggestions: {
            $filter: {
              input: candidates,
              as: "candidate",
              cond: {
                $regexMatch: {
                  input: "$$candidate.value",
                  regex: `^${escapeRegex(query)}`,
                  options: "i",
                },
              },
            },
          },
        },
      },
      { $unwind: "$suggestions" },
      {
        $group: {
          _id: {
            type: "$suggestions.type",
            value: { $toLower: "$suggestions.value" },
          },
          type: { $first: "$suggestions.type" },
          value: { $first: "$suggestions.value" },
        },
      },
      { $sort: { value: 1 } },
      { $limit: 5 },
      { $project: { _id: 0, type: 1, value: 1 } },
    ]).collation({ locale: "en", strength: 2 });

    res.json({ suggestions });
  } catch (error) {
    next(error);
  }
};

exports.getFarmerProduce = async (req, res, next) => {
  try {
    const { farmerId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(farmerId)) {
      return res.status(400).json({ message: "Invalid farmer id." });
    }

    const farmer = await Farmer.findById(farmerId)
      .select("name farmName avatarStyle")
      .lean();
    if (!farmer) {
      return res.status(404).json({ message: "Farmer not found." });
    }

    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const totalProduce = await Produce.countDocuments({ farmer: farmerId });
    const produce = await Produce.find({ farmer: farmerId })
      .sort({ createdAt: -1, _id: 1 })
      .skip((page - 1) * PRODUCE_PER_PAGE)
      .limit(PRODUCE_PER_PAGE)
      .select(
        "name category status quantity unit price location imageUrl createdAt",
      )
      .lean();

    res.json({
      farmer,
      produce,
      page,
      pageSize: PRODUCE_PER_PAGE,
      totalProduce,
      hasMore: page * PRODUCE_PER_PAGE < totalProduce,
    });
  } catch (error) {
    next(error);
  }
};

exports.getMyProduce = async (req, res, next) => {
  try {
    const produce = await Produce.find({ farmer: req.farmer._id }).sort({
      createdAt: -1,
    });
    res.json(produce);
  } catch (error) {
    next(error);
  }
};

exports.updateProduce = async (req, res, next) => {
  let uploadedImage;

  try {
    if (req.file) {
      const listing = await Produce.findOne({
        _id: req.params.id,
        farmer: req.farmer._id,
      });

      if (!listing) {
        return res.status(404).json({ message: "Produce listing not found." });
      }

      const imageFormat = getImageFormat(req.file.buffer);
      if (!imageFormat || imageFormat.mimeType !== req.file.mimetype) {
        const error = new Error(
          "The selected file is not a valid JPG, PNG, or WebP image.",
        );
        error.status = 400;
        throw error;
      }

      if (!isCloudinaryConfigured()) {
        const error = new Error("Cloudinary is not configured on the server.");
        error.status = 503;
        throw error;
      }

      const oldPublicId = listing.imagePublicId;
      uploadedImage = await uploadImageBuffer(req.file.buffer);
      listing.imageUrl = uploadedImage.secure_url;
      listing.imagePublicId = uploadedImage.public_id;
      await listing.save();
      uploadedImage = null;

      if (oldPublicId && oldPublicId !== listing.imagePublicId) {
        await removeCloudinaryImageIfUnreferenced(oldPublicId, listing._id);
      }

      return res.json(listing);
    }

    const { name, category, status, quantity, unit, price, location } =
      req.body;
    const produce = await Produce.findOneAndUpdate(
      { _id: req.params.id, farmer: req.farmer._id },
      {
        name,
        category,
        status: status || "available",
        quantity,
        unit,
        price,
        location,
      },
      { new: true, runValidators: true },
    );

    if (!produce) {
      return res.status(404).json({ message: "Produce listing not found." });
    }

    res.json(produce);
  } catch (error) {
    if (uploadedImage?.public_id) {
      try {
        await cloudinary.uploader.destroy(uploadedImage.public_id, {
          resource_type: "image",
        });
      } catch (cleanupError) {
        console.error(
          "Unable to remove unlinked Cloudinary replacement:",
          cleanupError,
        );
      }
    }

    next(error);
  }
};

exports.deleteProduce = async (req, res, next) => {
  try {
    const produce = await Produce.findOneAndDelete({
      _id: req.params.id,
      farmer: req.farmer._id,
    });

    if (!produce) {
      return res.status(404).json({ message: "Produce listing not found." });
    }

    await removeCloudinaryImageIfUnreferenced(
      produce.imagePublicId,
      produce._id,
    );

    res.json({ message: "Produce listing deleted." });
  } catch (error) {
    next(error);
  }
};
