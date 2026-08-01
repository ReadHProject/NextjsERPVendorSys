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

const commissionCalculateSchema = z.object({
  orderId: z.string(),
});

const commissionConfigSchema = z.object({
  roleId: z.string(),
  percentage: z.number().min(0).max(100),
  minOrderAmt: z.number().min(0).optional(),
  maxOrderAmt: z.number().optional(),
});

router.get("/", authenticate, requirePermission("commission.read"), async (req, res, next) => {
  try {
    const { page, pageSize, skip } = paginate(req.query.page, req.query.pageSize);
    const status = req.query.status || "";
    const salesmanId = req.query.salesmanId || "";

    const where = {
      AND: [
        status ? { status } : {},
        salesmanId ? { salesmanId } : {},
      ],
    };

    const [items, total] = await Promise.all([
      prisma.salesCommission.findMany({
        where,
        include: { salesman: { select: { name: true, email: true } }, order: { select: { orderNumber: true, grandTotal: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.salesCommission.count({ where }),
    ]);

    res.json({ success: true, data: { items, total, page, pageSize } });
  } catch (error) { next(error); }
});

router.post("/calculate", authenticate, requirePermission("commission.configure"), validate(commissionCalculateSchema), async (req, res, next) => {
  try {
    const { orderId } = req.body;
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { user: true } });
    if (!order) throw new NotFoundError("Order");
    if (!order.salesmanId) throw new BadRequestError("Order has no salesman");

    const existing = await prisma.salesCommission.findFirst({ where: { orderId } });
    if (existing) throw new BadRequestError("Commission already calculated for this order");

    const config = await prisma.commissionConfig.findFirst();
    const percentage = config ? Number(config.percentage) : 0;
    const amount = Number(order.grandTotal) * (percentage / 100);

    const commission = await prisma.salesCommission.create({
      data: {
        salesmanId: order.salesmanId,
        orderId,
        amount,
        percentage,
        status: "PENDING",
      },
    });

    await audit({ userId: req.user.id, action: "calculate", entityType: "commission", entityId: commission.id, newValue: { orderId, amount } });
    res.status(201).json({ success: true, data: commission });
  } catch (error) { next(error); }
});

router.patch("/:id/approve", authenticate, requirePermission("commission.approve"), async (req, res, next) => {
  try {
    const commission = await prisma.salesCommission.findUnique({ where: { id: req.params.id } });
    if (!commission) throw new NotFoundError("Commission");
    if (commission.status !== "PENDING") throw new BadRequestError("Commission is not pending");

    const updated = await prisma.salesCommission.update({
      where: { id: req.params.id },
      data: { status: "APPROVED" },
    });

    await audit({ userId: req.user.id, action: "approve", entityType: "commission", entityId: req.params.id });
    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
});

router.patch("/:id/pay", authenticate, requirePermission("commission.pay"), async (req, res, next) => {
  try {
    const commission = await prisma.salesCommission.findUnique({ where: { id: req.params.id } });
    if (!commission) throw new NotFoundError("Commission");
    if (commission.status !== "APPROVED") throw new BadRequestError("Commission must be approved before payment");

    const updated = await prisma.salesCommission.update({
      where: { id: req.params.id },
      data: { status: "PAID", paidAt: new Date() },
    });

    let wallet = await prisma.commissionWallet.findUnique({ where: { userId: commission.salesmanId } });
    if (!wallet) {
      wallet = await prisma.commissionWallet.create({
        data: { userId: commission.salesmanId, balance: 0, totalEarned: 0, totalWithdrawn: 0 },
      });
    }

    await prisma.commissionWallet.update({
      where: { id: wallet.id },
      data: { balance: { increment: Number(commission.amount) }, totalEarned: { increment: Number(commission.amount) } },
    });

    await prisma.commissionWalletTransaction.create({
      data: { walletId: wallet.id, type: "CREDIT", amount: Number(commission.amount), reference: commission.id, description: "Commission payment" },
    });

    await audit({ userId: req.user.id, action: "pay", entityType: "commission", entityId: req.params.id, newValue: { amount: Number(commission.amount) } });
    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
});

router.get("/config", authenticate, requirePermission("commission.configure"), async (req, res, next) => {
  try {
    const configs = await prisma.commissionConfig.findMany({ include: { role: true } });
    res.json({ success: true, data: configs });
  } catch (error) { next(error); }
});

router.put("/config", authenticate, requirePermission("commission.configure"), validate(commissionConfigSchema), async (req, res, next) => {
  try {
    const { roleId, percentage, minOrderAmt, maxOrderAmt } = req.body;

    const config = await prisma.commissionConfig.upsert({
      where: { roleId },
      update: { percentage, minOrderAmt, maxOrderAmt },
      create: { roleId, percentage, minOrderAmt: minOrderAmt || 0, maxOrderAmt },
      include: { role: true },
    });

    await audit({ userId: req.user.id, action: "update", entityType: "commission_config", entityId: config.id, newValue: { roleId, percentage } });
    res.json({ success: true, data: config });
  } catch (error) { next(error); }
});

router.get("/wallet", authenticate, async (req, res, next) => {
  try {
    let wallet = await prisma.commissionWallet.findUnique({
      where: { userId: req.user.id },
      include: { transactions: { orderBy: { createdAt: "desc" }, take: 50 } },
    });

    if (!wallet) {
      wallet = await prisma.commissionWallet.create({
        data: { userId: req.user.id, balance: 0, totalEarned: 0, totalWithdrawn: 0 },
      });
    }

    res.json({ success: true, data: wallet });
  } catch (error) { next(error); }
});

module.exports = router;
