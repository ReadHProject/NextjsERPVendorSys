const express = require("express");
const router = express.Router();
const { z } = require("zod");
const { prisma } = require("../../config/database");
const { hashPassword } = require("../../utils/password");
const { paginate, makeSlug } = require("../../utils/helpers");
const { authenticate } = require("../../middleware/auth");
const { requirePermission } = require("../../middleware/rbac");
const { validate } = require("../../middleware/validate");
const { NotFoundError, BadRequestError } = require("../../utils/errors");
const { audit } = require("../../middleware/audit");

const userCreateSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  mobile: z.string().optional(),
  password: z.string().min(6),
  role: z.string(),
  businessName: z.string().optional(),
  gstNumber: z.string().optional(),
  stateCode: z.string().optional(),
  address: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).default("ACTIVE"),
});

const userUpdateSchema = userCreateSchema.partial().omit({ password: true });

router.get("/", authenticate, requirePermission("user.list"), async (req, res, next) => {
  try {
    const { page, pageSize, skip } = paginate(req.query.page, req.query.pageSize);
    const q = req.query.q || "";
    const status = req.query.status || "";
    const role = req.query.role || "";

    const where = {
      AND: [
        q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : {},
        status ? { status } : {},
        role ? { roles: { some: { role: { name: role } } } } : {},
      ],
    };

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: { roles: { include: { role: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.user.count({ where }),
    ]);

    const mapped = items.map((u) => ({
      ...u,
      passwordHash: undefined,
      roles: u.roles.map((ur) => ur.role.name),
    }));

    res.json({ success: true, data: { items: mapped, total, page, pageSize } });
  } catch (error) { next(error); }
});

router.post("/", authenticate, requirePermission("user.create"), validate(userCreateSchema), async (req, res, next) => {
  try {
    const { name, email, password, role, mobile, businessName, gstNumber, stateCode, address, status } = req.body;
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) throw new BadRequestError("Email already exists");

    const roleRecord = await prisma.role.findUnique({ where: { name: role } });
    if (!roleRecord) throw new BadRequestError(`Role '${role}' not found`);

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
        mobile: mobile || null,
        businessName: businessName || null,
        gstNumber: gstNumber || null,
        stateCode: stateCode || null,
        address: address || null,
        status: status || "ACTIVE",
        roles: { create: { roleId: roleRecord.id } },
      },
      include: { roles: { include: { role: true } } },
    });

    await audit({ userId: req.user.id, action: "create", entityType: "user", entityId: user.id, newValue: { name, email, role } });

    res.status(201).json({
      success: true,
      data: { ...user, passwordHash: undefined, roles: user.roles.map((ur) => ur.role.name) },
    });
  } catch (error) { next(error); }
});

router.get("/:id", authenticate, requirePermission("user.read"), async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } },
    });
    if (!user) throw new NotFoundError("User");

    res.json({
      success: true,
      data: {
        ...user,
        passwordHash: undefined,
        roles: user.roles.map((ur) => ({ name: ur.role.name, permissions: ur.role.permissions.map((rp) => rp.permission.code) })),
      },
    });
  } catch (error) { next(error); }
});

router.put("/:id", authenticate, requirePermission("user.update"), validate(userUpdateSchema), async (req, res, next) => {
  try {
    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError("User");

    const { role, ...updateData } = req.body;

    if (role) {
      const roleRecord = await prisma.role.findUnique({ where: { name: role } });
      if (!roleRecord) throw new BadRequestError(`Role '${role}' not found`);

      await prisma.userRole.deleteMany({ where: { userId: req.params.id } });
      await prisma.userRole.create({ data: { userId: req.params.id, roleId: roleRecord.id } });
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: updateData,
      include: { roles: { include: { role: true } } },
    });

    await audit({ userId: req.user.id, action: "update", entityType: "user", entityId: user.id, oldValue: { name: existing.name }, newValue: req.body });

    res.json({ success: true, data: { ...user, passwordHash: undefined, roles: user.roles.map((ur) => ur.role.name) } });
  } catch (error) { next(error); }
});

router.delete("/:id", authenticate, requirePermission("user.delete"), async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) throw new NotFoundError("User");
    if (user.email === "admin@demo.local") throw new BadRequestError("Cannot delete demo admin");

    await prisma.user.update({ where: { id: req.params.id }, data: { status: "INACTIVE" } });
    await audit({ userId: req.user.id, action: "delete", entityType: "user", entityId: req.params.id });

    res.json({ success: true, data: { message: "User deactivated" } });
  } catch (error) { next(error); }
});

router.post("/:id/roles", authenticate, requirePermission("user.update"), async (req, res, next) => {
  try {
    const { role } = req.body;
    const roleRecord = await prisma.role.findUnique({ where: { name: role } });
    if (!roleRecord) throw new BadRequestError(`Role '${role}' not found`);

    const existing = await prisma.userRole.findUnique({ where: { userId_roleId: { userId: req.params.id, roleId: roleRecord.id } } });
    if (existing) throw new BadRequestError("User already has this role");

    await prisma.userRole.create({ data: { userId: req.params.id, roleId: roleRecord.id } });
    await audit({ userId: req.user.id, action: "update", entityType: "user", entityId: req.params.id, newValue: { addedRole: role } });

    res.json({ success: true, data: { message: `Role '${role}' assigned` } });
  } catch (error) { next(error); }
});

router.delete("/:id/roles/:roleId", authenticate, requirePermission("user.update"), async (req, res, next) => {
  try {
    await prisma.userRole.deleteMany({ where: { userId: req.params.id, roleId: req.params.roleId } });
    await audit({ userId: req.user.id, action: "update", entityType: "user", entityId: req.params.id, newValue: { removedRoleId: req.params.roleId } });
    res.json({ success: true, data: { message: "Role removed" } });
  } catch (error) { next(error); }
});

module.exports = router;
