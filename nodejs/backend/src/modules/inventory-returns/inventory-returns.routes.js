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

const returnProcessSchema = z.object({
  returnId: z.string(),
  items: z.array(z.object({
    returnItemId: z.string(),
    action: z.enum(["RESTOCK", "DAMAGE"]),
  })).min(1),
});

router.get("/", authenticate, requirePermission("inventory.return.read"), async (req, res, next) => {
  try {
    const { page, pageSize, skip } = paginate(req.query.page, req.query.pageSize);
    const status = req.query.status || "";

    const where = {
      AND: [
        status ? { status } : {},
      ],
    };

    const [items, total] = await Promise.all([
      prisma.returnRequest.findMany({
        where,
        include: { order: { select: { orderNumber: true } }, items: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.returnRequest.count({ where }),
    ]);

    res.json({ success: true, data: { items, total, page, pageSize } });
  } catch (error) { next(error); }
});

router.post("/process", authenticate, requirePermission("inventory.return.create"), validate(returnProcessSchema), async (req, res, next) => {
  try {
    const { returnId, items } = req.body;

    const returnRequest = await prisma.returnRequest.findUnique({
      where: { id: returnId },
      include: { items: true },
    });
    if (!returnRequest) throw new NotFoundError("Return request");
    if (returnRequest.status !== "APPROVED") throw new BadRequestError("Return must be approved before processing");

    const movementType = items.some((i) => i.action === "DAMAGE") ? "RETURN_DAMAGE" : "RETURN_RESTOCK";

    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        const returnItem = returnRequest.items.find((ri) => ri.id === item.returnItemId);
        if (!returnItem) continue;

        await tx.inventoryMovement.create({
          data: {
            productId: returnItem.orderItem.productId,
            variantId: returnItem.orderItem.variantId || null,
            warehouseId: returnRequest.orderId,
            type: item.action === "RESTOCK" ? "RETURN_RESTOCK" : "RETURN_DAMAGE",
            quantity: 1,
            reference: `Return ${returnId}`,
          },
        });
      }

      const newStatus = items.every((i) => i.action === "RESTOCK") ? "RESTOCKED" : "DAMAGED";
      await tx.returnRequest.update({
        where: { id: returnId },
        data: { status: newStatus },
      });
    });

    await audit({ userId: req.user.id, action: "process", entityType: "inventory_return", entityId: returnId, newValue: { itemCount: items.length } });
    res.json({ success: true, data: { message: "Return processed successfully" } });
  } catch (error) { next(error); }
});

router.patch("/:id", authenticate, requirePermission("inventory.return.update"), async (req, res, next) => {
  try {
    const { status, note } = req.body;
    const returnRequest = await prisma.returnRequest.findUnique({ where: { id: req.params.id } });
    if (!returnRequest) throw new NotFoundError("Return request");

    const updated = await prisma.returnRequest.update({
      where: { id: req.params.id },
      data: { status, note: note || undefined },
    });

    await audit({ userId: req.user.id, action: "update", entityType: "inventory_return", entityId: req.params.id, oldValue: { status: returnRequest.status }, newValue: { status } });
    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
});

module.exports = router;
