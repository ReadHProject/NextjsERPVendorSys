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

const upgradeCreateSchema = z.object({
  requestedRoleId: z.string(),
  reason: z.string().optional(),
});

const upgradeActionSchema = z.object({
  adminNote: z.string().optional(),
});

router.get("/", authenticate, requirePermission("role.upgrade.read"), async (req, res, next) => {
  try {
    const { page, pageSize, skip } = paginate(req.query.page, req.query.pageSize);
    const status = req.query.status || "";

    const where = {
      AND: [
        status ? { status } : {},
      ],
    };

    const [items, total] = await Promise.all([
      prisma.roleUpgradeRequest.findMany({
        where,
        include: {
          user: { select: { name: true, email: true } },
          currentRole: { select: { name: true } },
          requestedRole: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.roleUpgradeRequest.count({ where }),
    ]);

    res.json({ success: true, data: { items, total, page, pageSize } });
  } catch (error) { next(error); }
});

router.post("/", authenticate, validate(upgradeCreateSchema), async (req, res, next) => {
  try {
    const { requestedRoleId, reason } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { roles: { include: { role: true } } },
    });
    if (!user || !user.roles.length) throw new BadRequestError("User has no role");

    const currentRoleId = user.roles[0].roleId;

    const existing = await prisma.roleUpgradeRequest.findFirst({
      where: { userId: req.user.id, status: "PENDING" },
    });
    if (existing) throw new BadRequestError("You already have a pending upgrade request");

    const request = await prisma.roleUpgradeRequest.create({
      data: {
        userId: req.user.id,
        currentRoleId,
        requestedRoleId,
        reason,
      },
      include: { currentRole: { select: { name: true } }, requestedRole: { select: { name: true } } },
    });

    await audit({ userId: req.user.id, action: "create", entityType: "role_upgrade_request", entityId: request.id, newValue: { requestedRoleId, reason } });
    res.status(201).json({ success: true, data: request });
  } catch (error) { next(error); }
});

router.patch("/:id/approve", authenticate, requirePermission("role.upgrade.approve"), validate(upgradeActionSchema), async (req, res, next) => {
  try {
    const request = await prisma.roleUpgradeRequest.findUnique({ where: { id: req.params.id } });
    if (!request) throw new NotFoundError("Upgrade request");
    if (request.status !== "PENDING") throw new BadRequestError("Request is not pending");

    const updated = await prisma.$transaction(async (tx) => {
      const r = await tx.roleUpgradeRequest.update({
        where: { id: req.params.id },
        data: { status: "APPROVED", adminNote: req.body.adminNote },
      });

      await tx.userRole.deleteMany({ where: { userId: request.userId, roleId: request.currentRoleId } });
      await tx.userRole.create({ data: { userId: request.userId, roleId: request.requestedRoleId } });

      return r;
    });

    await audit({ userId: req.user.id, action: "approve", entityType: "role_upgrade_request", entityId: req.params.id });
    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
});

router.patch("/:id/reject", authenticate, requirePermission("role.upgrade.reject"), validate(upgradeActionSchema), async (req, res, next) => {
  try {
    const request = await prisma.roleUpgradeRequest.findUnique({ where: { id: req.params.id } });
    if (!request) throw new NotFoundError("Upgrade request");
    if (request.status !== "PENDING") throw new BadRequestError("Request is not pending");

    const updated = await prisma.roleUpgradeRequest.update({
      where: { id: req.params.id },
      data: { status: "REJECTED", adminNote: req.body.adminNote },
    });

    await audit({ userId: req.user.id, action: "reject", entityType: "role_upgrade_request", entityId: req.params.id });
    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
});

module.exports = router;
