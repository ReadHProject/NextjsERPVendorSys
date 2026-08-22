const express = require("express");
const router = express.Router();
const { z } = require("zod");
const { prisma } = require("../../config/database");
const { paginate } = require("../../utils/helpers");
const { authenticate } = require("../../middleware/auth");
const { requirePermission, requireAnyRole } = require("../../middleware/rbac");
const { validate } = require("../../middleware/validate");
const { NotFoundError, BadRequestError } = require("../../utils/errors");
const { audit } = require("../../middleware/audit");
const { signAccessToken } = require("../../utils/jwt");

const loginAsSchema = z.object({
  targetUserId: z.string(),
  reason: z.string().optional(),
  expiresInMinutes: z.number().int().min(1).max(480).optional(),
});

router.post("/", authenticate, requireAnyRole("SUPER_ADMIN", "ADMIN"), validate(loginAsSchema), async (req, res, next) => {
  try {
    const { targetUserId, reason, expiresInMinutes } = req.body;

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!targetUser) throw new NotFoundError("Target user");
    if (targetUser.status !== "ACTIVE") throw new BadRequestError("Target user is not active");

    const expiresAt = new Date(Date.now() + (expiresInMinutes || 60) * 60 * 1000);

    const loginAs = await prisma.loginAsUser.create({
      data: {
        adminId: req.user.id,
        targetUserId,
        reason,
        expiresAt,
      },
      include: {
        admin: { select: { name: true, email: true } },
        targetUser: { select: { name: true, email: true } },
      },
    });

    const roles = (targetUser.roles || []).map((ur) => ur.role?.name).filter(Boolean);
    const permissions = Array.from(
      new Set(
        (targetUser.roles || []).flatMap((ur) =>
          (ur.role?.permissions || []).map((rp) => rp.permission?.code).filter(Boolean)
        )
      )
    );

    const impersonationToken = await signAccessToken({
      sub: targetUser.id,
      email: targetUser.email,
      roles,
      permissions: permissions.includes("*") ? ["*"] : permissions,
    });

    await audit({ userId: req.user.id, action: "login_as", entityType: "login_as", entityId: loginAs.id, newValue: { targetUserId, reason } });

    res.status(201).json({
      success: true,
      data: {
        ...loginAs,
        impersonationToken,
      },
    });
  } catch (error) { next(error); }
});

router.get("/", authenticate, requireAnyRole("SUPER_ADMIN", "ADMIN"), async (req, res, next) => {
  try {
    const { page, pageSize, skip } = paginate(req.query.page, req.query.pageSize);

    const [items, total] = await Promise.all([
      prisma.loginAsUser.findMany({
        where: { adminId: req.user.id },
        include: {
          admin: { select: { name: true, email: true } },
          targetUser: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.loginAsUser.count({ where: { adminId: req.user.id } }),
    ]);

    res.json({ success: true, data: { items, total, page, pageSize } });
  } catch (error) { next(error); }
});

module.exports = router;
