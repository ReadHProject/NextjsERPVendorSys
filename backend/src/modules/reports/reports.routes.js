const express = require("express");
const router = express.Router();
const { z } = require("zod");
const { prisma } = require("../../config/database");
const { paginate } = require("../../utils/helpers");
const { authenticate } = require("../../middleware/auth");
const { requirePermission } = require("../../middleware/rbac");
const { NotFoundError } = require("../../utils/errors");

router.get("/sales", authenticate, requirePermission("report.read"), async (req, res, next) => {
  try {
    const { page, pageSize, skip } = paginate(req.query.page, req.query.pageSize);
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

    const where = { createdAt: { gte: startDate, lte: endDate } };

    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: { items: true, user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.order.count({ where }),
    ]);

    const aggregate = await prisma.order.aggregate({ where, _sum: { subtotal: true, taxTotal: true, grandTotal: true }, _count: true });

    res.json({
      success: true,
      data: {
        items,
        total,
        page,
        pageSize,
        summary: {
          count: aggregate._count,
          subtotal: Number(aggregate._sum.subtotal || 0),
          taxTotal: Number(aggregate._sum.taxTotal || 0),
          grandTotal: Number(aggregate._sum.grandTotal || 0),
        },
      },
    });
  } catch (error) { next(error); }
});

router.get("/inventory", authenticate, requirePermission("report.read"), async (req, res, next) => {
  try {
    const { page, pageSize, skip } = paginate(req.query.page, req.query.pageSize);
    const warehouseId = req.query.warehouseId || "";

    const where = { AND: [warehouseId ? { warehouseId } : {}] };

    const [items, total] = await Promise.all([
      prisma.inventory.findMany({
        where,
        include: { product: true, variant: true, warehouse: true },
        orderBy: { quantity: "asc" },
        skip,
        take: pageSize,
      }),
      prisma.inventory.count({ where }),
    ]);

    const lowStock = await prisma.inventory.findMany({
      where: { quantity: { lte: 5 } },
      include: { product: true, warehouse: true },
      orderBy: { quantity: "asc" },
      take: 20,
    });

    res.json({ success: true, data: { items, total, page, pageSize, lowStock } });
  } catch (error) { next(error); }
});

router.get("/profit-loss", authenticate, requirePermission("report.read"), async (req, res, next) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

    const [revenue, expenses] = await Promise.all([
      prisma.payment.aggregate({ where: { status: "PAID", createdAt: { gte: startDate, lte: endDate } }, _sum: { amount: true } }),
      prisma.supplierTransaction.aggregate({ where: { type: "PAYMENT", date: { gte: startDate, lte: endDate } }, _sum: { amount: true } }),
    ]);

    const totalRevenue = Number(revenue._sum.amount || 0);
    const totalExpenses = Number(expenses._sum.amount || 0);
    const profit = totalRevenue - totalExpenses;

    res.json({
      success: true,
      data: {
        totalRevenue,
        totalExpenses,
        profit,
        startDate,
        endDate,
      },
    });
  } catch (error) { next(error); }
});

router.get("/purchase", authenticate, requirePermission("report.read"), async (req, res, next) => {
  try {
    const { page, pageSize, skip } = paginate(req.query.page, req.query.pageSize);
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

    const where = { createdAt: { gte: startDate, lte: endDate } };

    const [items, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        include: { supplier: true, items: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.purchaseOrder.count({ where }),
    ]);

    const aggregate = await prisma.purchaseOrder.aggregate({ where, _sum: { grandTotal: true }, _count: true });

    res.json({
      success: true,
      data: {
        items,
        total,
        page,
        pageSize,
        summary: { count: aggregate._count, totalAmount: Number(aggregate._sum.grandTotal || 0) },
      },
    });
  } catch (error) { next(error); }
});

router.get("/commission", authenticate, requirePermission("report.read"), async (req, res, next) => {
  try {
    const { page, pageSize, skip } = paginate(req.query.page, req.query.pageSize);
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

    const where = { createdAt: { gte: startDate, lte: endDate } };

    const [items, total] = await Promise.all([
      prisma.salesCommission.findMany({
        where,
        include: { salesman: { select: { name: true } }, order: { select: { orderNumber: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.salesCommission.count({ where }),
    ]);

    const aggregate = await prisma.salesCommission.aggregate({ where, _sum: { amount: true }, _count: true });

    res.json({
      success: true,
      data: {
        items,
        total,
        page,
        pageSize,
        summary: { count: aggregate._count, totalCommission: Number(aggregate._sum.amount || 0) },
      },
    });
  } catch (error) { next(error); }
});

router.get("/customer", authenticate, requirePermission("report.read"), async (req, res, next) => {
  try {
    const { page, pageSize, skip } = paginate(req.query.page, req.query.pageSize);

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where: { roles: { some: { role: { name: "CUSTOMER" } } } },
        include: { _count: { select: { orders: true } }, customerType: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.user.count({ where: { roles: { some: { role: { name: "CUSTOMER" } } } } }),
    ]);

    const mapped = items.map((u) => ({ ...u, passwordHash: undefined }));

    res.json({ success: true, data: { items: mapped, total, page, pageSize } });
  } catch (error) { next(error); }
});

module.exports = router;
