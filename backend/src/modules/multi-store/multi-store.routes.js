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

const storeSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1).max(20),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  managerId: z.string().optional(),
  capacity: z.number().int().optional(),
  status: z.boolean().optional(),
});

router.get("/", authenticate, requirePermission("store.read"), async (req, res, next) => {
  try {
    const { page, pageSize, skip } = paginate(req.query.page, req.query.pageSize);
    const q = req.query.q || "";

    const where = {
      AND: [
        q ? { name: { contains: q, mode: "insensitive" } } : {},
      ],
    };

    const [items, total] = await Promise.all([
      prisma.warehouse.findMany({
        where,
        include: { _count: { select: { inventory: true } } },
        orderBy: { name: "asc" },
        skip,
        take: pageSize,
      }),
      prisma.warehouse.count({ where }),
    ]);

    res.json({ success: true, data: { items, total, page, pageSize } });
  } catch (error) { next(error); }
});

router.post("/", authenticate, requirePermission("store.create"), validate(storeSchema), async (req, res, next) => {
  try {
    const existing = await prisma.warehouse.findUnique({ where: { code: req.body.code } });
    if (existing) throw new BadRequestError("Store code already exists");

    const store = await prisma.warehouse.create({ data: req.body });
    await audit({ userId: req.user.id, action: "create", entityType: "store", entityId: store.id, newValue: { name: store.name, code: store.code } });
    res.status(201).json({ success: true, data: store });
  } catch (error) { next(error); }
});

router.get("/:id", authenticate, requirePermission("store.read"), async (req, res, next) => {
  try {
    const store = await prisma.warehouse.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { inventory: true } } },
    });
    if (!store) throw new NotFoundError("Store");
    res.json({ success: true, data: store });
  } catch (error) { next(error); }
});

router.put("/:id", authenticate, requirePermission("store.update"), validate(storeSchema), async (req, res, next) => {
  try {
    const existing = await prisma.warehouse.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError("Store");

    if (req.body.code && req.body.code !== existing.code) {
      const codeExists = await prisma.warehouse.findUnique({ where: { code: req.body.code } });
      if (codeExists) throw new BadRequestError("Store code already exists");
    }

    const store = await prisma.warehouse.update({ where: { id: req.params.id }, data: req.body });
    await audit({ userId: req.user.id, action: "update", entityType: "store", entityId: store.id, newValue: req.body });
    res.json({ success: true, data: store });
  } catch (error) { next(error); }
});

router.delete("/:id", authenticate, requirePermission("store.delete"), async (req, res, next) => {
  try {
    const store = await prisma.warehouse.findUnique({ where: { id: req.params.id }, include: { _count: { select: { inventory: true, purchaseOrders: true } } } });
    if (!store) throw new NotFoundError("Store");
    if (store._count.inventory > 0) throw new BadRequestError("Cannot delete store with inventory");
    if (store._count.purchaseOrders > 0) throw new BadRequestError("Cannot delete store with purchase orders");

    await prisma.warehouse.delete({ where: { id: req.params.id } });
    await audit({ userId: req.user.id, action: "delete", entityType: "store", entityId: req.params.id });
    res.json({ success: true, data: { message: "Store deleted" } });
  } catch (error) { next(error); }
});

router.get("/:id/inventory", authenticate, requirePermission("store.read"), async (req, res, next) => {
  try {
    const { page, pageSize, skip } = paginate(req.query.page, req.query.pageSize);
    const store = await prisma.warehouse.findUnique({ where: { id: req.params.id } });
    if (!store) throw new NotFoundError("Store");

    const [items, total] = await Promise.all([
      prisma.inventory.findMany({
        where: { warehouseId: req.params.id },
        include: { product: true, variant: true },
        orderBy: { quantity: "asc" },
        skip,
        take: pageSize,
      }),
      prisma.inventory.count({ where: { warehouseId: req.params.id } }),
    ]);

    res.json({ success: true, data: { items, total, page, pageSize } });
  } catch (error) { next(error); }
});

router.get("/:id/sales", authenticate, requirePermission("store.read"), async (req, res, next) => {
  try {
    const { page, pageSize, skip } = paginate(req.query.page, req.query.pageSize);
    const store = await prisma.warehouse.findUnique({ where: { id: req.params.id } });
    if (!store) throw new NotFoundError("Store");

    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where: { createdAt: { gte: startDate, lte: endDate } },
        include: { items: true, user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.order.count({ where: { createdAt: { gte: startDate, lte: endDate } } }),
    ]);

    res.json({ success: true, data: { items, total, page, pageSize } });
  } catch (error) { next(error); }
});

module.exports = router;
