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

const receiveSchema = z.object({
  warehouseId: z.string(),
  items: z.array(z.object({
    productId: z.string(),
    variantId: z.string().optional(),
    quantity: z.number().int().positive(),
    batchNumber: z.string().optional(),
  })).min(1),
  note: z.string().optional(),
});

router.get("/", authenticate, requirePermission("inventory.receive.read"), async (req, res, next) => {
  try {
    const { page, pageSize, skip } = paginate(req.query.page, req.query.pageSize);

    const [items, total] = await Promise.all([
      prisma.inventoryMovement.findMany({
        where: { type: "PURCHASE" },
        include: { warehouse: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.inventoryMovement.count({ where: { type: "PURCHASE" } }),
    ]);

    res.json({ success: true, data: { items, total, page, pageSize } });
  } catch (error) { next(error); }
});

router.post("/receive", authenticate, requirePermission("inventory.receive.create"), validate(receiveSchema), async (req, res, next) => {
  try {
    const { warehouseId, items, note } = req.body;

    const warehouse = await prisma.warehouse.findUnique({ where: { id: warehouseId } });
    if (!warehouse) throw new NotFoundError("Warehouse");

    const results = await prisma.$transaction(async (tx) => {
      const movements = [];
      for (const item of items) {
        const existingInventory = await tx.inventory.findFirst({
          where: { 
            productId: item.productId, 
            variantId: item.variantId || null, 
            warehouseId, 
            batchNumber: item.batchNumber || null 
          }
        });

        if (existingInventory) {
          await tx.inventory.update({
            where: { id: existingInventory.id },
            data: { quantity: { increment: item.quantity } }
          });
        } else {
          await tx.inventory.create({
            data: { 
              productId: item.productId, 
              variantId: item.variantId || null, 
              warehouseId, 
              batchNumber: item.batchNumber || null, 
              quantity: item.quantity 
            }
          });
        }

        const movement = await tx.inventoryMovement.create({
          data: {
            productId: item.productId,
            variantId: item.variantId || null,
            warehouseId,
            type: "PURCHASE",
            quantity: item.quantity,
            reference: note || "Inventory receive",
          },
        });

        movements.push(movement);
      }
      return movements;
    });

    await audit({ userId: req.user.id, action: "receive", entityType: "inventory", newValue: { warehouseId, itemCount: items.length } });
    res.status(201).json({ success: true, data: results });
  } catch (error) { next(error); }
});

module.exports = router;
