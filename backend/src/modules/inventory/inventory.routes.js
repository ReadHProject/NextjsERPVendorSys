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

const inventoryAdjustSchema = z.object({
  productId: z.string(),
  variantId: z.string().optional(),
  warehouseId: z.string(),
  batchNumber: z.string().optional(),
  quantity: z.number().int(),
  type: z.enum(["PURCHASE", "ADJUSTMENT", "RETURN_RESTOCK", "RETURN_DAMAGE"]),
  note: z.string().optional(),
});

router.get("/", authenticate, requirePermission("inventory.read"), async (req, res, next) => {
  try {
    const { page, pageSize, skip } = paginate(req.query.page, req.query.pageSize);
    const q = req.query.q || "";
    const warehouseId = req.query.warehouseId || "";

    const where = {
      AND: [
        q ? { product: { name: { contains: q, mode: "insensitive" } } } : {},
        warehouseId ? { warehouseId } : {},
      ],
    };

    const [items, total] = await Promise.all([
      prisma.inventory.findMany({
        where,
        include: { product: true, variant: true, warehouse: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.inventory.count({ where }),
    ]);

    res.json({ success: true, data: { items, total, page, pageSize } });
  } catch (error) { next(error); }
});

router.post("/adjust", authenticate, requirePermission("inventory.adjust"), validate(inventoryAdjustSchema), async (req, res, next) => {
  try {
    const { productId, variantId, warehouseId, batchNumber, quantity, type, note } = req.body;

    const inventory = await prisma.$transaction(async (tx) => {
      const existing = await tx.inventory.findFirst({
        where: { productId, variantId: variantId || null, warehouseId, batchNumber: batchNumber || null },
      });

      let updatedInventory;
      if (existing) {
        const newQty = existing.quantity + quantity;
        updatedInventory = await tx.inventory.update({ where: { id: existing.id }, data: { quantity: Math.max(0, newQty) } });
      } else {
        updatedInventory = await tx.inventory.create({
          data: { productId, variantId: variantId || null, warehouseId, batchNumber: batchNumber || null, quantity: Math.max(0, quantity) },
        });
      }

      await tx.inventoryMovement.create({
        data: { productId, variantId: variantId || null, warehouseId, type, quantity, reference: note },
      });

      return updatedInventory;
    });

    await audit({ userId: req.user.id, action: "adjust", entityType: "inventory", entityId: inventory.id, newValue: { productId, quantity, type } });
    res.json({ success: true, data: inventory });
  } catch (error) { next(error); }
});

router.get("/movements", authenticate, requirePermission("inventory.read"), async (req, res, next) => {
  try {
    const { page, pageSize, skip } = paginate(req.query.page, req.query.pageSize);
    const where = {};
    if (req.query.productId) where.productId = req.query.productId;
    if (req.query.warehouseId) where.warehouseId = req.query.warehouseId;

    const [items, total] = await Promise.all([
      prisma.inventoryMovement.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: pageSize }),
      prisma.inventoryMovement.count({ where }),
    ]);

    res.json({ success: true, data: { items, total, page, pageSize } });
  } catch (error) { next(error); }
});

router.get("/alerts", authenticate, requirePermission("stock.alert.read"), async (req, res, next) => {
  try {
    const alerts = await prisma.stockAlert.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json({ success: true, data: alerts });
  } catch (error) { next(error); }
});

module.exports = router;
