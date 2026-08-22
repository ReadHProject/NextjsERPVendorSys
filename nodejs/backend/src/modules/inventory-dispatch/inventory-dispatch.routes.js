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

const dispatchCreateSchema = z.object({
  orderId: z.string(),
  warehouseId: z.string(),
  note: z.string().optional(),
  items: z.array(z.object({
    orderItemId: z.string(),
    barcodeId: z.string(),
  })).min(1),
});

const dispatchScanSchema = z.object({
  barcodeId: z.string(),
  scanned: z.boolean(),
});

router.get("/", authenticate, requirePermission("inventory.dispatch.read"), async (req, res, next) => {
  try {
    const { page, pageSize, skip } = paginate(req.query.page, req.query.pageSize);
    const status = req.query.status || "";

    const where = {
      AND: [
        status ? { status } : {},
      ],
    };

    const [items, total] = await Promise.all([
      prisma.dispatch.findMany({
        where,
        include: { order: { select: { orderNumber: true } }, items: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.dispatch.count({ where }),
    ]);

    res.json({ success: true, data: { items, total, page, pageSize } });
  } catch (error) { next(error); }
});

router.post("/", authenticate, requirePermission("inventory.dispatch.create"), validate(dispatchCreateSchema), async (req, res, next) => {
  try {
    const { orderId, warehouseId, note, items } = req.body;

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundError("Order");

    const existing = await prisma.dispatch.findUnique({ where: { orderId } });
    if (existing) throw new BadRequestError("Dispatch already exists for this order");

    const dispatch = await prisma.$transaction(async (tx) => {
      const d = await tx.dispatch.create({
        data: {
          orderId,
          warehouseId,
          note,
          status: "PENDING",
          items: { create: items },
        },
        include: { items: true },
      });
      return d;
    });

    await audit({ userId: req.user.id, action: "create", entityType: "inventory_dispatch", entityId: dispatch.id, newValue: { orderId, warehouseId } });
    res.status(201).json({ success: true, data: dispatch });
  } catch (error) { next(error); }
});

router.get("/:id", authenticate, requirePermission("inventory.dispatch.read"), async (req, res, next) => {
  try {
    const dispatch = await prisma.dispatch.findUnique({
      where: { id: req.params.id },
      include: { order: true, items: true },
    });
    if (!dispatch) throw new NotFoundError("Dispatch");
    res.json({ success: true, data: dispatch });
  } catch (error) { next(error); }
});

router.patch("/:id/scan", authenticate, requirePermission("inventory.dispatch.scan"), validate(dispatchScanSchema), async (req, res, next) => {
  try {
    const { barcodeId, scanned } = req.body;
    const dispatch = await prisma.dispatch.findUnique({ where: { id: req.params.id }, include: { items: true } });
    if (!dispatch) throw new NotFoundError("Dispatch");

    const item = dispatch.items.find((i) => i.barcodeId === barcodeId);
    if (!item) throw new BadRequestError("Barcode not found in this dispatch");

    const updatedItem = await prisma.dispatchItem.update({
      where: { id: item.id },
      data: { scanned },
    });

    const allScanned = dispatch.items.every((i) => (i.barcodeId === barcodeId ? scanned : i.scanned));
    if (allScanned && dispatch.status === "PENDING") {
      await prisma.dispatch.update({
        where: { id: req.params.id },
        data: { status: "DISPATCHED", completedAt: new Date() },
      });
    }

    await audit({ userId: req.user.id, action: "scan", entityType: "inventory_dispatch", entityId: req.params.id, newValue: { barcodeId, scanned } });
    res.json({ success: true, data: updatedItem });
  } catch (error) { next(error); }
});

module.exports = router;
