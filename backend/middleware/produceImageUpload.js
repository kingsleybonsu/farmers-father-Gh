const multer = require("multer");

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const permittedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_SIZE, files: 1 },
  fileFilter(req, file, callback) {
    if (!permittedMimeTypes.has(file.mimetype)) {
      const error = new Error("Choose a JPG, PNG, or WebP image.");
      error.status = 400;
      return callback(error);
    }

    callback(null, true);
  },
});

function produceImageUpload(req, res, next) {
  upload.single("image")(req, res, (error) => {
    if (!error) return next();

    if (error instanceof multer.MulterError) {
      error.status = 400;
      error.message = error.code === "LIMIT_FILE_SIZE"
        ? "Images must be 5 MB or smaller."
        : "Please upload one image file at a time.";
    }

    next(error);
  });
}

module.exports = { produceImageUpload, MAX_IMAGE_SIZE };