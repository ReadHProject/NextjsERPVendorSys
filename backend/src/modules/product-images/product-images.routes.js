const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { prisma } = require("../../config/database");
const { authenticate } = require("../../middleware/auth");
const { requirePermission } = require("../../middleware/rbac");
const { NotFoundError, BadRequestError } = require("../../utils/errors");
const { audit } = require("../../middleware/audit");

const uploadsDir = path.join(__dirname, "../../../uploads");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(uploadsDir, { recursive: true });
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `product-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.post("/:productId", authenticate, requirePermission("product.image.upload"), upload.single("image"), async (req, res, next) => {
  try {
    if (!req.file) throw new BadRequestError("No image uploaded");

    const product = await prisma.product.findUnique({ where: { id: req.params.productId } });
    if (!product) throw new NotFoundError("Product");

    const imageUrl = `/uploads/${req.file.filename}`;

    const existingCount = await prisma.productImage.count({ where: { productId: req.params.productId } });

    const image = await prisma.productImage.create({
      data: {
        productId: req.params.productId,
        url: imageUrl,
        alt: req.file.originalname,
        isPrimary: existingCount === 0,
        sortOrder: existingCount,
      },
    });

    await audit({ userId: req.user.id, action: "upload", entityType: "product_image", entityId: image.id, newValue: { filename: req.file.filename } });

    res.status(201).json({
      success: true,
      data: image,
    });
  } catch (error) { next(error); }
});

router.delete("/:productId/:imageId", authenticate, requirePermission("product.image.delete"), async (req, res, next) => {
  try {
    const image = await prisma.productImage.findUnique({ where: { id: req.params.imageId } });
    if (!image) throw new NotFoundError("Product image");

    await prisma.productImage.delete({ where: { id: req.params.imageId } });
    await audit({ userId: req.user.id, action: "delete", entityType: "product_image", entityId: req.params.imageId });

    res.json({ success: true, data: { message: "Image deleted" } });
  } catch (error) { next(error); }
});

module.exports = router;
