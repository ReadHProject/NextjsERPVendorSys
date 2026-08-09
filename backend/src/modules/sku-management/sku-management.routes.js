const express = require("express");
const router = express.Router();
const { z } = require("zod");
const { prisma } = require("../../config/database");
const { paginate, generateBarcode, makeSlug } = require("../../utils/helpers");
const { authenticate } = require("../../middleware/auth");
const { requirePermission } = require("../../middleware/rbac");
const { validate } = require("../../middleware/validate");
const { NotFoundError, BadRequestError } = require("../../utils/errors");
const { audit } = require("../../middleware/audit");

const skuGenerateSchema = z.object({
  productId: z.string(),
  count: z.number().int().min(1).max(100).optional(),
});

router.get("/", authenticate, requirePermission("product.sku.read"), async (req, res, next) => {
  try {
    const { page, pageSize, skip } = paginate(req.query.page, req.query.pageSize);
    const q = req.query.q || "";
    const productId = req.query.productId || "";

    const where = {
      AND: [
        q ? { sku: { contains: q, mode: "insensitive" } } : {},
        productId ? { productId } : {},
      ],
    };

    const [items, total] = await Promise.all([
      prisma.productVariant.findMany({
        where,
        include: { product: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.productVariant.count({ where }),
    ]);

    res.json({ success: true, data: { items, total, page, pageSize } });
  } catch (error) { next(error); }
});

router.post("/generate", authenticate, requirePermission("product.sku.generate"), validate(skuGenerateSchema), async (req, res, next) => {
  try {
    const { productId, count = 1 } = req.body;
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundError("Product");

    const existingVariants = await prisma.productVariant.findMany({
      where: { productId },
      orderBy: { createdAt: "desc" },
    });

    const startNum = existingVariants.length + 1;
    const generated = [];

    for (let i = 0; i < count; i++) {
      const sku = `${makeSlug(product.name).toUpperCase()}-${String(startNum + i).padStart(3, "0")}`;
      const barcode = generateBarcode();

      const variant = await prisma.productVariant.create({
        data: {
          productId,
          sku,
          barcode,
          name: `${product.name} - ${startNum + i}`,
          mrp: 0,
          price: 0,
        },
      });

      generated.push(variant);
    }

    await audit({ userId: req.user.id, action: "generate", entityType: "sku", entityId: productId, newValue: { count: generated.length } });
    res.status(201).json({ success: true, data: generated });
  } catch (error) { next(error); }
});

module.exports = router;
