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

const brandSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  logo: z.string().optional(),
  description: z.string().optional(),
  defaultDiscount: z.number().min(0).max(100).optional(),
  status: z.boolean().optional(),
  applyToProducts: z.boolean().optional(),
});

router.get("/", async (req, res, next) => {
  try {
    const brands = await prisma.brand.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { products: true } } } });
    res.json({ success: true, data: brands });
  } catch (error) { next(error); }
});

router.post("/", authenticate, requirePermission("brand.create"), validate(brandSchema), async (req, res, next) => {
  try {
    const { name, slug, logo, description, defaultDiscount, status } = req.body;
    const brand = await prisma.brand.create({
      data: { name, slug: slug || makeSlug(name), logo, description, defaultDiscount: defaultDiscount || 0, status: status !== undefined ? status : true },
    });
    await audit({ userId: req.user.id, action: "create", entityType: "brand", entityId: brand.id, newValue: { name } });
    res.status(201).json({ success: true, data: brand });
  } catch (error) { next(error); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const brand = await prisma.brand.findUnique({ where: { id: req.params.id }, include: { _count: { select: { products: true } } } });
    if (!brand) throw new NotFoundError("Brand");
    res.json({ success: true, data: brand });
  } catch (error) { next(error); }
});

router.put("/:id", authenticate, requirePermission("brand.update"), validate(brandSchema), async (req, res, next) => {
  try {
    const existing = await prisma.brand.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError("Brand");
    const { applyToProducts, ...data } = req.body;
    if (data.name && !data.slug) data.slug = makeSlug(data.name);
    
    const brand = await prisma.$transaction(async (tx) => {
      const updated = await tx.brand.update({ where: { id: req.params.id }, data });
      
      if (applyToProducts && data.defaultDiscount !== undefined) {
        await tx.product.updateMany({
          where: { brandId: req.params.id },
          data: { discountPercent: data.defaultDiscount }
        });
      }
      
      return updated;
    });

    await audit({ userId: req.user.id, action: "update", entityType: "brand", entityId: brand.id, newValue: data });
    res.json({ success: true, data: brand });
  } catch (error) { next(error); }
});

router.delete("/:id", authenticate, requirePermission("brand.delete"), async (req, res, next) => {
  try {
    const brand = await prisma.brand.findUnique({ where: { id: req.params.id }, include: { _count: { select: { products: true } } } });
    if (!brand) throw new NotFoundError("Brand");
    if (brand._count.products > 0) throw new BadRequestError("Cannot delete brand with products");
    await prisma.brand.delete({ where: { id: req.params.id } });
    await audit({ userId: req.user.id, action: "delete", entityType: "brand", entityId: req.params.id });
    res.json({ success: true, data: { message: "Brand deleted" } });
  } catch (error) { next(error); }
});

module.exports = router;
