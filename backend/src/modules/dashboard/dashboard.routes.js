const express = require("express");
const router = express.Router();
const { prisma } = require("../../config/database");
const { authenticate } = require("../../middleware/auth");
const { requirePermission } = require("../../middleware/rbac");

router.get("/summary", authenticate, requirePermission("dashboard.read"), async (req, res, next) => {
  try {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const start30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [revenueAgg, orderCount, customerCount, productCount, lowStock, pendingReturns, pendingUpgrades, recentOrders] = await Promise.all([
      prisma.payment.aggregate({ where: { status: "PAID", createdAt: { gte: startOfMonth } }, _sum: { amount: true } }),
      prisma.order.count(),
      prisma.user.count({ where: { roles: { some: { role: { name: "CUSTOMER" } } } } }),
      prisma.product.count({ where: { status: "ACTIVE" } }),
      prisma.inventory.findMany({ where: { quantity: { lte: 5 } }, include: { product: true, warehouse: true }, take: 10, orderBy: { quantity: "asc" } }),
      prisma.returnRequest.count({ where: { status: "REQUESTED" } }),
      prisma.roleUpgradeRequest.count({ where: { status: "PENDING" } }),
      prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 10, include: { user: { select: { name: true, email: true } } } }),
    ]);

    res.json({
      success: true,
      data: {
        revenueThisMonth: Number(revenueAgg._sum.amount || 0),
        totalOrders: orderCount,
        totalCustomers: customerCount,
        totalProducts: productCount,
        lowStock,
        pendingReturns,
        pendingUpgrades,
        recentOrders,
      },
    });
  } catch (error) { next(error); }
});

router.get("/charts", authenticate, requirePermission("dashboard.read"), async (req, res, next) => {
  try {
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ start: d, end: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59), label: d.toLocaleString("default", { month: "short", year: "2-digit" }) });
    }

    const salesData = await Promise.all(
      months.map(async (m) => {
        const agg = await prisma.payment.aggregate({ where: { status: "PAID", createdAt: { gte: m.start, lte: m.end } }, _sum: { amount: true }, _count: true });
        return { month: m.label, revenue: Number(agg._sum.amount || 0), orders: agg._count };
      })
    );

    const topProducts = await prisma.orderItem.groupBy({
      by: ["productId"],
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { lineTotal: "desc" } },
      take: 5,
    });

    res.json({ success: true, data: { salesData, topProducts } });
  } catch (error) { next(error); }
});

module.exports = router;
