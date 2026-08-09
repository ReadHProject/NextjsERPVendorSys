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

const returnCreateSchema = z.object({
  orderId: z.string(),
  reason: z.string().optional(),
  note: z.string().optional(),
  items: z.array(z.object({
    orderItemId: z.string(),
    barcodeId: z.string().optional(),
    condition: z.string().optional(),
    action: z.string().optional(),
  })).min(1),
});

const returnStatusSchema = z.object({
  status: z.enum(["REQUESTED", "APPROVED", "REJECTED", "RESTOCKED", "DAMAGED"]),
  note: z.string().optional(),
});

router.get("/", authenticate, requirePermission("return.read"), async (req, res, next) => {
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
        include: { order: { select: { orderNumber: true } }, items: true, user: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.returnRequest.count({ where }),
    ]);

    res.json({ success: true, data: { items, total, page, pageSize } });
  } catch (error) { next(error); }
});

router.post("/", authenticate, requirePermission("return.create"), validate(returnCreateSchema), async (req, res, next) => {
  try {
    const { orderId, reason, note, items } = req.body;

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundError("Order");

    const returnRequest = await prisma.$transaction(async (tx) => {
      const rr = await tx.returnRequest.create({
        data: {
          orderId,
          userId: req.user.id,
          reason,
          note,
          status: "REQUESTED",
          items: { create: items },
        },
        include: { items: true },
      });
      return rr;
    });

    await audit({ userId: req.user.id, action: "create", entityType: "return", entityId: returnRequest.id, newValue: { orderId, reason } });
    res.status(201).json({ success: true, data: returnRequest });
  } catch (error) { next(error); }
});

router.get("/:id", authenticate, requirePermission("return.read"), async (req, res, next) => {
  try {
    const returnRequest = await prisma.returnRequest.findUnique({
      where: { id: req.params.id },
      include: { order: true, items: { include: { orderItem: true } }, user: { select: { name: true, email: true } } },
    });
    if (!returnRequest) throw new NotFoundError("Return request");
    res.json({ success: true, data: returnRequest });
  } catch (error) { next(error); }
});

router.patch("/:id/status", authenticate, requirePermission("return.update"), validate(returnStatusSchema), async (req, res, next) => {
  try {
    const { status, note } = req.body;
    const returnRequest = await prisma.returnRequest.findUnique({ where: { id: req.params.id } });
    if (!returnRequest) throw new NotFoundError("Return request");

    const updated = await prisma.returnRequest.update({
      where: { id: req.params.id },
      data: { status, note: note || undefined },
    });

    await audit({ userId: req.user.id, action: "status_change", entityType: "return", entityId: req.params.id, oldValue: { status: returnRequest.status }, newValue: { status } });
    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
});

module.exports = router;
