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

const paymentCreateSchema = z.object({
  orderId: z.string().optional(),
  userId: z.string().optional(),
  method: z.enum(["CASH", "UPI", "RAZORPAY", "STRIPE", "COD"]),
  amount: z.number().positive(),
  transactionId: z.string().optional(),
  gateway: z.string().optional(),
  note: z.string().optional(),
});

router.get("/", authenticate, requirePermission("payment.read"), async (req, res, next) => {
  try {
    const { page, pageSize, skip } = paginate(req.query.page, req.query.pageSize);
    const status = req.query.status || "";
    const method = req.query.method || "";

    const where = {
      AND: [
        status ? { status } : {},
        method ? { method } : {},
      ],
    };

    const [items, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: { order: { select: { orderNumber: true } }, user: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.payment.count({ where }),
    ]);

    res.json({ success: true, data: { items, total, page, pageSize } });
  } catch (error) { next(error); }
});

router.post("/", authenticate, requirePermission("payment.create"), validate(paymentCreateSchema), async (req, res, next) => {
  try {
    const { orderId, userId, method, amount, transactionId, gateway, note } = req.body;

    const payment = await prisma.payment.create({
      data: {
        orderId: orderId || null,
        userId: userId || req.user.id,
        method,
        status: "PENDING",
        amount,
        transactionId: transactionId || null,
        gateway: gateway || null,
        note: note || null,
      },
    });

    await audit({ userId: req.user.id, action: "create", entityType: "payment", entityId: payment.id, newValue: { method, amount } });
    res.status(201).json({ success: true, data: payment });
  } catch (error) { next(error); }
});

router.get("/:id", authenticate, requirePermission("payment.read"), async (req, res, next) => {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id },
      include: { order: true, user: { select: { name: true, email: true } } },
    });
    if (!payment) throw new NotFoundError("Payment");
    res.json({ success: true, data: payment });
  } catch (error) { next(error); }
});

module.exports = router;
