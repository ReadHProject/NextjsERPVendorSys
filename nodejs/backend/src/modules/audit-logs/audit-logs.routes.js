const express = require("express");
const router = express.Router();
const { z } = require("zod");
const { prisma } = require("../../config/database");
const { paginate } = require("../../utils/helpers");
const { authenticate } = require("../../middleware/auth");
const { requirePermission } = require("../../middleware/rbac");
const { NotFoundError } = require("../../utils/errors");

router.get("/", authenticate, requirePermission("audit.log.read"), async (req, res, next) => {
  try {
    const { page, pageSize, skip } = paginate(req.query.page, req.query.pageSize);
    const entityType = req.query.entityType || "";
    const action = req.query.action || "";
    const userId = req.query.userId || "";

    const where = {
      AND: [
        entityType ? { entityType } : {},
        action ? { action } : {},
        userId ? { userId } : {},
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

module.exports = router;
