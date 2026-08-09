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

router.get("/", authenticate, requirePermission("stock.alert.read"), async (req, res, next) => {
  try {
    const { page, pageSize, skip } = paginate(req.query.page, req.query.pageSize);
    const isRead = req.query.isRead !== undefined ? req.query.isRead === "true" : undefined;

    const where = {
      AND: [
        isRead !== undefined ? { isRead } : {},
      ],
    };

    const [items, total] = await Promise.all([
      prisma.stockAlert.findMany({
        where,
        include: { product: { select: { name: true, slug: true } }, warehouse: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.stockAlert.count({ where }),
    ]);

    res.json({ success: true, data: { items, total, page, pageSize } });
  } catch (error) { next(error); }
});

router.patch("/:id/read", authenticate, requirePermission("stock.alert.update"), async (req, res, next) => {
  try {
    const alert = await prisma.stockAlert.findUnique({ where: { id: req.params.id } });
    if (!alert) throw new NotFoundError("Stock alert");

    const updated = await prisma.stockAlert.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });

    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
});

module.exports = router;
