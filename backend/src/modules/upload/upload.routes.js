const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { authenticate } = require("../../middleware/auth");
const { requirePermission } = require("../../middleware/rbac");
const { BadRequestError } = require("../../utils/errors");
const { audit } = require("../../middleware/audit");

const uploadsDir = path.join(__dirname, "../../../uploads");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(uploadsDir, { recursive: true });
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
    cb(null, name);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf", ".csv", ".xlsx", ".xls"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new BadRequestError(`File type ${ext} not allowed`), false);
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

router.post("/", authenticate, requirePermission("upload.create"), upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) throw new BadRequestError("No file uploaded");

    const fileUrl = `/uploads/${req.file.filename}`;
    await audit({ userId: req.user.id, action: "upload", entityType: "file", newValue: { filename: req.file.filename, size: req.file.size } });

    res.status(201).json({
      success: true,
      data: {
        url: fileUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
      },
    });
  } catch (error) { next(error); }
});

module.exports = router;
