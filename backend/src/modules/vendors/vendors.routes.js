const express = require("express");
const router = express.Router();
const { z } = require("zod");
const { prisma } = require("../../config/database");
const { paginate, makeSlug } = require("../../utils/helpers");
const { authenticate } = require("../../middleware/auth");
const { requirePermission } = require("../../middleware/rbac");
const { validate } = require("../../middleware/validate");
const { NotFoundError, BadRequestError } = require("../../utils/errors");
const { audit } = require("../../middleware/audit");

const vendorRegisterSchema = z.object({
  companyName: z.string().min(1),
  gstin: z.string().optional(),
  description: z.string().optional(),
  logo: z.string().optional(),
  commissionRate: z.number().min(0).max(100).optional(),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  ifsc: z.string().optional(),
});

const vendorUpdateSchema = vendorRegisterSchema.partial();

const vendorProductSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  description: z.string().optional(),
  categoryId: z.string().nullable().optional(),
  variants: z.array(z.object({
    sku: z.string(),
    name: z.string(),
    price: z.number().nonnegative(),
    mrp: z.number().nonnegative(),
    stock: z.number().int().min(0).optional(),
    image: z.string().optional(),
  })).min(1),
});

router.get("/", authenticate, requirePermission("vendor.read"), async (req, res, next) => {
  try {
    const { page, pageSize, skip } = paginate(req.query.page, req.query.pageSize);
    const status = req.query.status || "";
    const q = req.query.q || "";

    const where = {
      AND: [
        status ? { status } : {},
        q ? { companyName: { contains: q, mode: "insensitive" } } : {},
      ],
    };

    const [items, total] = await Promise.all([
      prisma.vendor.findMany({
        where,
        include: { user: { select: { name: true, email: true } }, _count: { select: { products: true, orders: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.vendor.count({ where }),
    ]);

    res.json({ success: true, data: { items, total, page, pageSize } });
  } catch (error) { next(error); }
});

router.post("/register", authenticate, validate(vendorRegisterSchema), async (req, res, next) => {
  try {
    const existing = await prisma.vendor.findUnique({ where: { userId: req.user.id } });
    if (existing) throw new BadRequestError("Vendor profile already exists");

    const vendor = await prisma.vendor.create({
      data: {
        userId: req.user.id,
        ...req.body,
        status: "PENDING",
      },
      include: { user: { select: { name: true, email: true } } },
    });

    await audit({ userId: req.user.id, action: "register", entityType: "vendor", entityId: vendor.id, newValue: { companyName: vendor.companyName } });
    res.status(201).json({ success: true, data: vendor });
  } catch (error) { next(error); }
});

router.get("/:id", authenticate, requirePermission("vendor.read"), async (req, res, next) => {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { id: req.params.id },
      include: { user: { select: { name: true, email: true } }, products: { include: { variants: true } }, _count: { select: { orders: true } } },
    });
    if (!vendor) throw new NotFoundError("Vendor");
    res.json({ success: true, data: vendor });
  } catch (error) { next(error); }
});

router.put("/:id", authenticate, requirePermission("vendor.update"), validate(vendorUpdateSchema), async (req, res, next) => {
  try {
    const existing = await prisma.vendor.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError("Vendor");

    const vendor = await prisma.vendor.update({ where: { id: req.params.id }, data: req.body });
    await audit({ userId: req.user.id, action: "update", entityType: "vendor", entityId: vendor.id, newValue: req.body });
    res.json({ success: true, data: vendor });
  } catch (error) { next(error); }
});

router.patch("/:id/approve", authenticate, requirePermission("vendor.approve"), async (req, res, next) => {
  try {
    const { status, rejectedReason } = req.body;
    const vendor = await prisma.vendor.findUnique({ where: { id: req.params.id } });
    if (!vendor) throw new NotFoundError("Vendor");

    const updated = await prisma.vendor.update({
      where: { id: req.params.id },
      data: { status: status || "APPROVED", rejectedReason: rejectedReason || null, approvedAt: status === "APPROVED" ? new Date() : undefined },
    });

    await audit({ userId: req.user.id, action: "approve", entityType: "vendor", entityId: req.params.id, newValue: { status: updated.status } });
    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
});

router.get("/:id/products", authenticate, requirePermission("vendor.read"), async (req, res, next) => {
  try {
    const { page, pageSize, skip } = paginate(req.query.page, req.query.pageSize);
    const vendor = await prisma.vendor.findUnique({ where: { id: req.params.id } });
    if (!vendor) throw new NotFoundError("Vendor");

    const [items, total] = await Promise.all([
      prisma.vendorProduct.findMany({
        where: { vendorId: req.params.id },
        include: { variants: true, category: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.vendorProduct.count({ where: { vendorId: req.params.id } }),
    ]);

    res.json({ success: true, data: { items, total, page, pageSize } });
  } catch (error) { next(error); }
});

router.post("/:id/products", authenticate, requirePermission("vendor.create"), validate(vendorProductSchema), async (req, res, next) => {
  try {
    const vendor = await prisma.vendor.findUnique({ where: { id: req.params.id } });
    if (!vendor) throw new NotFoundError("Vendor");

    const product = await prisma.vendorProduct.create({
      data: {
        vendorId: req.params.id,
        name: req.body.name,
        slug: req.body.slug || makeSlug(req.body.name),
        description: req.body.description,
        categoryId: req.body.categoryId || null,
        variants: { create: req.body.variants },
      },
      include: { variants: true },
    });

    await audit({ userId: req.user.id, action: "create", entityType: "vendor_product", entityId: product.id, newValue: { name: product.name } });
    res.status(201).json({ success: true, data: product });
  } catch (error) { next(error); }
});

router.get("/:id/orders", authenticate, requirePermission("vendor.read"), async (req, res, next) => {
  try {
    const { page, pageSize, skip } = paginate(req.query.page, req.query.pageSize);
    const vendor = await prisma.vendor.findUnique({ where: { id: req.params.id } });
    if (!vendor) throw new NotFoundError("Vendor");

    const status = req.query.status || "";
    const where = {
      AND: [
        { vendorId: req.params.id },
        status ? { status } : {},
      ],
    };

    const [items, total] = await Promise.all([
      prisma.vendorOrder.findMany({
        where,
        include: { items: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.vendorOrder.count({ where }),
    ]);

    res.json({ success: true, data: { items, total, page, pageSize } });
  } catch (error) { next(error); }
});

module.exports = router;
