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

router.get("/", authenticate, requirePermission("notification.read"), async (req, res, next) => {
  try {
    const { page, pageSize, skip } = paginate(req.query.page, req.query.pageSize);
    const userId = req.query.userId || req.user.id;

    const where = { userId };

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({ success: true, data: { items, total, page, pageSize } });
  } catch (error) { next(error); }
});

router.get("/unread-count", authenticate, async (req, res, next) => {
  try {
    const count = await prisma.auditLog.count({
      where: { userId: req.user.id },
    });
    res.json({ success: true, data: { count } });
  } catch (error) { next(error); }
});

router.patch("/:id/read", authenticate, async (req, res, next) => {
  try {
    const log = await prisma.auditLog.findUnique({ where: { id: req.params.id } });
    if (!log) throw new NotFoundError("Notification");

    await audit({ userId: req.user.id, action: "mark_read", entityType: "notification", entityId: req.params.id });
    res.json({ success: true, data: { message: "Marked as read" } });
  } catch (error) { next(error); }
});

router.patch("/read-all", authenticate, async (req, res, next) => {
  try {
    await audit({ userId: req.user.id, action: "mark_all_read", entityType: "notification" });
    res.json({ success: true, data: { message: "All notifications marked as read" } });
  } catch (error) { next(error); }
});

module.exports = router;
