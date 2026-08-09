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

const customerTypeSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  discountPct: z.number().min(0).max(100).optional(),
  sortOrder: z.number().int().optional(),
  status: z.boolean().optional(),
});

router.get("/", authenticate, requirePermission("customer.type.read"), async (req, res, next) => {
  try {
    const types = await prisma.customerType.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { users: true } } },
    });
    res.json({ success: true, data: types });
  } catch (error) { next(error); }
});

router.post("/", authenticate, requirePermission("customer.type.create"), validate(customerTypeSchema), async (req, res, next) => {
  try {
    const existing = await prisma.customerType.findUnique({ where: { name: req.body.name } });
    if (existing) throw new BadRequestError("Customer type name already exists");

    const type = await prisma.customerType.create({ data: req.body });
    await audit({ userId: req.user.id, action: "create", entityType: "customer_type", entityId: type.id, newValue: { name: type.name } });
    res.status(201).json({ success: true, data: type });
  } catch (error) { next(error); }
});

router.get("/:id", authenticate, requirePermission("customer.type.read"), async (req, res, next) => {
  try {
    const type = await prisma.customerType.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { users: true } } },
    });
    if (!type) throw new NotFoundError("Customer type");
    res.json({ success: true, data: type });
  } catch (error) { next(error); }
});

router.put("/:id", authenticate, requirePermission("customer.type.update"), validate(customerTypeSchema), async (req, res, next) => {
  try {
    const existing = await prisma.customerType.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError("Customer type");

    const type = await prisma.customerType.update({ where: { id: req.params.id }, data: req.body });
    await audit({ userId: req.user.id, action: "update", entityType: "customer_type", entityId: type.id, newValue: req.body });
    res.json({ success: true, data: type });
  } catch (error) { next(error); }
});

router.delete("/:id", authenticate, requirePermission("customer.type.read"), async (req, res, next) => {
  try {
    const type = await prisma.customerType.findUnique({ where: { id: req.params.id }, include: { _count: { select: { users: true } } } });
    if (!type) throw new NotFoundError("Customer type");
    if (type._count.users > 0) throw new BadRequestError("Cannot delete customer type with assigned users");

    await prisma.customerType.delete({ where: { id: req.params.id } });
    await audit({ userId: req.user.id, action: "delete", entityType: "customer_type", entityId: req.params.id });
    res.json({ success: true, data: { message: "Customer type deleted" } });
  } catch (error) { next(error); }
});

module.exports = router;
