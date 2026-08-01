const express = require("express");
const router = express.Router();
const { prisma } = require("../../config/database");
const { paginate } = require("../../utils/helpers");
const { authenticate } = require("../../middleware/auth");
const { requirePermission } = require("../../middleware/rbac");
const { NotFoundError } = require("../../utils/errors");

router.get("/", authenticate, requirePermission("activity.read"), async (req, res, next) => {
  try {
    const { page, pageSize, skip } = paginate(req.query.page, req.query.pageSize);
    const entityType = req.query.entityType || "";

    const where = {
      AND: [
        entityType ? { entityType } : {},
      ],
    };

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({ success: true, data: { items, total, page, pageSize } });
  } catch (error) { next(error); }
});

router.get("/stats", authenticate, requirePermission("activity.stats"), async (req, res, next) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todayCount, weekCount, monthCount, byType] = await Promise.all([
      prisma.auditLog.count({ where: { createdAt: { gte: startOfDay } } }),
      prisma.auditLog.count({ where: { createdAt: { gte: startOfWeek } } }),
      prisma.auditLog.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.auditLog.groupBy({
        by: ["entityType"],
        _count: true,
        orderBy: { _count: { entityType: "desc" } },
        take: 10,
      }),
    ]);

    res.json({
      success: true,
      data: {
        today: todayCount,
        thisWeek: weekCount,
        thisMonth: monthCount,
        byType: byType.map((t) => ({ type: t.entityType, count: t._count })),
      },
    });
  } catch (error) { next(error); }
});

module.exports = router;
