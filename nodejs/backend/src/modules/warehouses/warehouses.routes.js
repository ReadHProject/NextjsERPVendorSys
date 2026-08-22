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

const warehouseSchema = z.object({
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

const transferSchema = z.object({
  sourceWarehouseId: z.string(),
  destinationWarehouseId: z.string(),
  note: z.string().optional(),
  items: z.array(z.object({
    productId: z.string(),
    variantId: z.string().optional(),
    quantity: z.number().int().positive(),
  })).min(1),
});

router.get("/", authenticate, requirePermission("warehouse.read"), async (req, res, next) => {
  try {
    const warehouses = await prisma.warehouse.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { inventory: true } } },
    });
    res.json({ success: true, data: warehouses });
  } catch (error) { next(error); }
});

router.post("/", authenticate, requirePermission("warehouse.create"), validate(warehouseSchema), async (req, res, next) => {
  try {
    const warehouse = await prisma.warehouse.create({ data: req.body });
    await audit({ userId: req.user.id, action: "create", entityType: "warehouse", entityId: warehouse.id, newValue: { name: req.body.name } });
    res.status(201).json({ success: true, data: warehouse });
  } catch (error) { next(error); }
});

router.get("/:id", authenticate, requirePermission("warehouse.read"), async (req, res, next) => {
  try {
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: req.params.id },
      include: { inventory: { include: { product: true, variant: true } } },
    });
    if (!warehouse) throw new NotFoundError("Warehouse");
    res.json({ success: true, data: warehouse });
  } catch (error) { next(error); }
});

router.put("/:id", authenticate, requirePermission("warehouse.update"), validate(warehouseSchema), async (req, res, next) => {
  try {
    const existing = await prisma.warehouse.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError("Warehouse");
    const warehouse = await prisma.warehouse.update({ where: { id: req.params.id }, data: req.body });
    await audit({ userId: req.user.id, action: "update", entityType: "warehouse", entityId: warehouse.id, newValue: req.body });
    res.json({ success: true, data: warehouse });
  } catch (error) { next(error); }
});

router.post("/transfers", authenticate, requirePermission("warehouse.transfer.create"), validate(transferSchema), async (req, res, next) => {
  try {
    const { sourceWarehouseId, destinationWarehouseId, note, items } = req.body;
    if (sourceWarehouseId === destinationWarehouseId) throw new BadRequestError("Source and destination cannot be the same");

    const transfer = await prisma.$transaction(async (tx) => {
      for (const item of items) {
        const source = await tx.inventory.findFirst({
          where: { productId: item.productId, variantId: item.variantId || null, warehouseId: sourceWarehouseId },
        });
        if (!source || source.quantity < item.quantity) {
          throw new BadRequestError(`Insufficient stock for product ${item.productId}`);
        }
      }

      const t = await tx.warehouseTransfer.create({
        data: { sourceWarehouseId, destinationWarehouseId, note, items: { create: items }, status: "IN_TRANSIT" },
      });

      for (const item of items) {
        await tx.inventory.updateMany({
          where: { productId: item.productId, variantId: item.variantId || null, warehouseId: sourceWarehouseId },
          data: { quantity: { decrement: item.quantity } },
        });
        await tx.inventoryMovement.create({
          data: { productId: item.productId, variantId: item.variantId || null, warehouseId: sourceWarehouseId, type: "TRANSFER_OUT", quantity: item.quantity, reference: `Transfer ${t.id}` },
        });
      }

      return t;
    });

    await audit({ userId: req.user.id, action: "create", entityType: "warehouse_transfer", entityId: transfer.id, newValue: { sourceWarehouseId, destinationWarehouseId, itemCount: items.length } });
    res.status(201).json({ success: true, data: transfer });
  } catch (error) { next(error); }
});

router.get("/transfers", authenticate, requirePermission("warehouse.transfer.read"), async (req, res, next) => {
  try {
    const { page, pageSize, skip } = paginate(req.query.page, req.query.pageSize);
    const [items, total] = await Promise.all([
      prisma.warehouseTransfer.findMany({
        include: { source: true, destination: true, items: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.warehouseTransfer.count(),
    ]);
    res.json({ success: true, data: { items, total, page, pageSize } });
  } catch (error) { next(error); }
});

router.patch("/transfers/:id/complete", authenticate, requirePermission("warehouse.transfer.complete"), async (req, res, next) => {
  try {
    const transfer = await prisma.warehouseTransfer.findUnique({ where: { id: req.params.id }, include: { items: true } });
    if (!transfer) throw new NotFoundError("Transfer");
    if (transfer.status !== "IN_TRANSIT") throw new BadRequestError("Transfer is not in transit");

    await prisma.$transaction(async (tx) => {
      for (const item of transfer.items) {
        await tx.inventory.upsert({
          where: { productId_variantId_warehouseId_batchNumber: { productId: item.productId, variantId: item.variantId || null, warehouseId: transfer.destinationWarehouseId, batchNumber: null } },
          update: { quantity: { increment: item.quantity } },
          create: { productId: item.productId, variantId: item.variantId || null, warehouseId: transfer.destinationWarehouseId, quantity: item.quantity },
        });
        await tx.inventoryMovement.create({
          data: { productId: item.productId, variantId: item.variantId || null, warehouseId: transfer.destinationWarehouseId, type: "TRANSFER_IN", quantity: item.quantity, reference: `Transfer ${transfer.id}` },
        });
      }
      await tx.warehouseTransfer.update({ where: { id: req.params.id }, data: { status: "COMPLETED", completedAt: new Date() } });
    });

    await audit({ userId: req.user.id, action: "complete", entityType: "warehouse_transfer", entityId: req.params.id });
    res.json({ success: true, data: { message: "Transfer completed" } });
  } catch (error) { next(error); }
});

module.exports = router;
