const express = require("express");
const router = express.Router();
const { z } = require("zod");
const { prisma } = require("../../config/database");
const { authenticate } = require("../../middleware/auth");
const { requirePermission } = require("../../middleware/rbac");
const { validate } = require("../../middleware/validate");
const { NotFoundError, BadRequestError } = require("../../utils/errors");
const { audit } = require("../../middleware/audit");

const roleSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  permissionIds: z.array(z.string()).optional(),
});

router.get("/", authenticate, requirePermission("role.read"), async (req, res, next) => {
  try {
    const roles = await prisma.role.findMany({
      include: { _count: { select: { users: true, permissions: true } } },
      orderBy: { name: "asc" },
    });
    res.json({ success: true, data: roles });
  } catch (error) { next(error); }
});

router.post("/", authenticate, requirePermission("role.create"), validate(roleSchema), async (req, res, next) => {
  try {
    const { name, description, permissionIds } = req.body;
    const existing = await prisma.role.findUnique({ where: { name } });
    if (existing) throw new BadRequestError("Role name already exists");

    const role = await prisma.role.create({
      data: {
        name,
        description: description || null,
        permissions: permissionIds?.length
          ? { create: permissionIds.map((id) => ({ permissionId: id })) }
          : undefined,
      },
      include: { permissions: { include: { permission: true } } },
    });

    await audit({ userId: req.user.id, action: "create", entityType: "role", entityId: role.id, newValue: { name } });
    res.status(201).json({ success: true, data: role });
  } catch (error) { next(error); }
});

router.get("/permissions", authenticate, requirePermission("permission.read"), async (req, res, next) => {
  try {
    const permissions = await prisma.permission.findMany({ orderBy: [{ module: "asc" }, { action: "asc" }] });
    const grouped = permissions.reduce((acc, p) => {
      if (!acc[p.module]) acc[p.module] = [];
      acc[p.module].push(p);
      return acc;
    }, {});
    res.json({ success: true, data: grouped });
  } catch (error) { next(error); }
});

router.get("/:id", authenticate, requirePermission("role.read"), async (req, res, next) => {
  try {
    const role = await prisma.role.findUnique({
      where: { id: req.params.id },
      include: { permissions: { include: { permission: true } }, _count: { select: { users: true } } },
    });
    if (!role) throw new NotFoundError("Role");
    res.json({ success: true, data: role });
  } catch (error) { next(error); }
});

router.put("/:id", authenticate, requirePermission("role.update"), validate(roleSchema.partial()), async (req, res, next) => {
  try {
    const role = await prisma.role.findUnique({ where: { id: req.params.id } });
    if (!role) throw new NotFoundError("Role");
    if (role.isSystem) throw new BadRequestError("Cannot modify system roles");

    const { name, description, permissionIds } = req.body;
    const updated = await prisma.$transaction(async (tx) => {
      if (name) await tx.role.update({ where: { id: req.params.id }, data: { name, description } });
      if (permissionIds) {
        await tx.rolePermission.deleteMany({ where: { roleId: req.params.id } });
        if (permissionIds.length) {
          await tx.rolePermission.createMany({ data: permissionIds.map((pid) => ({ roleId: req.params.id, permissionId: pid })) });
        }
      }
      return tx.role.findUnique({ where: { id: req.params.id }, include: { permissions: { include: { permission: true } } } });
    });

    await audit({ userId: req.user.id, action: "update", entityType: "role", entityId: req.params.id, newValue: req.body });
    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
});

router.delete("/:id", authenticate, requirePermission("role.delete"), async (req, res, next) => {
  try {
    const role = await prisma.role.findUnique({ where: { id: req.params.id }, include: { _count: { select: { users: true } } } });
    if (!role) throw new NotFoundError("Role");
    if (role.isSystem) throw new BadRequestError("Cannot delete system roles");
    if (role._count.users > 0) throw new BadRequestError("Cannot delete role with assigned users");

    await prisma.role.delete({ where: { id: req.params.id } });
    await audit({ userId: req.user.id, action: "delete", entityType: "role", entityId: req.params.id });

    res.json({ success: true, data: { message: "Role deleted" } });
  } catch (error) { next(error); }
});

module.exports = router;
