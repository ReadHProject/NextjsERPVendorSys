const express = require("express");
const router = express.Router();
const { z } = require("zod");
const { prisma } = require("../../config/database");
const { paginate } = require("../../utils/helpers");
const { authenticate } = require("../../middleware/auth");
const { requirePermission } = require("../../middleware/rbac");
const { validate } = require("../../middleware/validate");
const { NotFoundError, BadRequestError } = require("../../utils/errors");
const { audit } = require("../../middleware/audit");

const variantSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  barcode: z.string().optional(),
  mrp: z.number().nonnegative(),
  price: z.number().nonnegative(),
  weight: z.number().optional(),
  image: z.string().optional(),
  attributes: z.any().optional(),
  status: z.boolean().optional(),
});

router.get("/:productId", authenticate, requirePermission("product.variant.read"), async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.productId } });
    if (!product) throw new NotFoundError("Product");

    const variants = await prisma.productVariant.findMany({
      where: { productId: req.params.productId },
      include: { inventory: true },
      orderBy: { createdAt: "asc" },
    });

    res.json({ success: true, data: variants });
  } catch (error) { next(error); }
});

router.post("/:productId", authenticate, requirePermission("product.variant.create"), validate(variantSchema), async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.productId } });
    if (!product) throw new NotFoundError("Product");

    const existingSku = await prisma.productVariant.findUnique({ where: { sku: req.body.sku } });
    if (existingSku) throw new BadRequestError("SKU already exists");

    const variant = await prisma.productVariant.create({
      data: {
        productId: req.params.productId,
        name: req.body.name,
        sku: req.body.sku,
        barcode: req.body.barcode || null,
        mrp: req.body.mrp,
        price: req.body.price,
        weight: req.body.weight || null,
        image: req.body.image || null,
        attributes: req.body.attributes || null,
        status: req.body.status !== undefined ? req.body.status : true,
      },
    });

    await audit({ userId: req.user.id, action: "create", entityType: "product_variant", entityId: variant.id, newValue: { name: variant.name, sku: variant.sku } });
    res.status(201).json({ success: true, data: variant });
  } catch (error) { next(error); }
});

router.put("/:id", authenticate, requirePermission("product.variant.update"), validate(variantSchema), async (req, res, next) => {
  try {
    const existing = await prisma.productVariant.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError("Product variant");

    if (req.body.sku && req.body.sku !== existing.sku) {
      const skuExists = await prisma.productVariant.findUnique({ where: { sku: req.body.sku } });
      if (skuExists) throw new BadRequestError("SKU already exists");
    }

    const variant = await prisma.productVariant.update({
      where: { id: req.params.id },
      data: req.body,
    });

    await audit({ userId: req.user.id, action: "update", entityType: "product_variant", entityId: variant.id, newValue: req.body });
    res.json({ success: true, data: variant });
  } catch (error) { next(error); }
});

router.delete("/:id", authenticate, requirePermission("product.variant.delete"), async (req, res, next) => {
  try {
    const variant = await prisma.productVariant.findUnique({ where: { id: req.params.id }, include: { _count: { select: { cartItems: true, orderItems: true } } } });
    if (!variant) throw new NotFoundError("Product variant");
    if (variant._count.orderItems > 0) throw new BadRequestError("Cannot delete variant with existing orders");

    await prisma.productVariant.delete({ where: { id: req.params.id } });
    await audit({ userId: req.user.id, action: "delete", entityType: "product_variant", entityId: req.params.id });
    res.json({ success: true, data: { message: "Variant deleted" } });
  } catch (error) { next(error); }
});

module.exports = router;
