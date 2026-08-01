const express = require("express");
const router = express.Router();
const { z } = require("zod");
const { prisma } = require("../../config/database");
const { makeSlug } = require("../../utils/helpers");
const { authenticate } = require("../../middleware/auth");
const { requirePermission } = require("../../middleware/rbac");
const { validate } = require("../../middleware/validate");
const { NotFoundError, BadRequestError } = require("../../utils/errors");
const { audit } = require("../../middleware/audit");

const productTypeSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  sortOrder: z.number().int().optional(),
  status: z.boolean().optional(),
});

router.get("/", authenticate, requirePermission("product.type.read"), async (req, res, next) => {
  try {
    const types = await prisma.productType.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { products: true } } },
    });
    res.json({ success: true, data: types });
  } catch (error) { next(error); }
});

router.post("/", authenticate, requirePermission("product.type.create"), validate(productTypeSchema), async (req, res, next) => {
  try {
    const existing = await prisma.productType.findUnique({ where: { name: req.body.name } });
    if (existing) throw new BadRequestError("Product type name already exists");

    const data = { ...req.body, slug: makeSlug(req.body.name) };
    const type = await prisma.productType.create({ data });
    await audit({ userId: req.user.id, action: "create", entityType: "product_type", entityId: type.id, newValue: { name: type.name } });
    res.status(201).json({ success: true, data: type });
  } catch (error) { next(error); }
});

router.get("/:id", authenticate, requirePermission("product.type.read"), async (req, res, next) => {
  try {
    const type = await prisma.productType.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { products: true } } },
    });
    if (!type) throw new NotFoundError("Product type");
    res.json({ success: true, data: type });
  } catch (error) { next(error); }
});

router.put("/:id", authenticate, requirePermission("product.type.update"), validate(productTypeSchema), async (req, res, next) => {
  try {
    const existing = await prisma.productType.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError("Product type");

    const data = { ...req.body };
    if (data.name && data.name !== existing.name) {
      data.slug = makeSlug(data.name);
    }
    const type = await prisma.productType.update({ where: { id: req.params.id }, data });
    await audit({ userId: req.user.id, action: "update", entityType: "product_type", entityId: type.id, newValue: req.body });
    res.json({ success: true, data: type });
  } catch (error) { next(error); }
});

router.delete("/:id", authenticate, requirePermission("product.type.read"), async (req, res, next) => {
  try {
    const type = await prisma.productType.findUnique({ where: { id: req.params.id }, include: { _count: { select: { products: true } } } });
    if (!type) throw new NotFoundError("Product type");
    if (type._count.products > 0) throw new BadRequestError("Cannot delete product type with assigned products");

    await prisma.productType.delete({ where: { id: req.params.id } });
    await audit({ userId: req.user.id, action: "delete", entityType: "product_type", entityId: req.params.id });
    res.json({ success: true, data: { message: "Product type deleted" } });
  } catch (error) { next(error); }
});

module.exports = router;
