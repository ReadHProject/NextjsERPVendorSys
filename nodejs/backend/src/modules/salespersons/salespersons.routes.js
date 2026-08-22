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

const salespersonSchema = z.object({
  userId: z.string(),
  employeeCode: z.string().optional(),
  assignedArea: z.string().optional(),
  targetAmount: z.number().optional(),
  commissionPct: z.number().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
});

router.get("/", authenticate, requirePermission("salesperson.read"), async (req, res, next) => {
  try {
    const { page, pageSize, skip } = paginate(req.query.page, req.query.pageSize);
    const q = req.query.q || "";

    const where = {
      AND: [
        q ? { user: { name: { contains: q, mode: "insensitive" } } } : {},
      ],
    };

    const [items, total] = await Promise.all([
      prisma.salesPerson.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.salesPerson.count({ where }),
    ]);

    res.json({ success: true, data: { items, total, page, pageSize } });
  } catch (error) { next(error); }
});

router.post("/", authenticate, requirePermission("salesperson.create"), validate(salespersonSchema), async (req, res, next) => {
  try {
    const existing = await prisma.salesPerson.findUnique({ where: { userId: req.body.userId } });
    if (existing) throw new BadRequestError("User is already a salesperson");

    const salesperson = await prisma.salesPerson.create({
      data: {
        userId: req.body.userId,
        employeeCode: req.body.employeeCode || null,
        assignedArea: req.body.assignedArea || null,
        targetAmount: req.body.targetAmount || null,
        commissionPct: req.body.commissionPct || 0,
        isActive: req.body.isActive !== undefined ? req.body.isActive : true,
      },
      include: { user: { select: { name: true, email: true } } },
    });

    await audit({ userId: req.user.id, action: "create", entityType: "salesperson", entityId: salesperson.id, newValue: { userId: req.body.userId } });
    res.status(201).json({ success: true, data: salesperson });
  } catch (error) { next(error); }
});

router.get("/:id", authenticate, requirePermission("salesperson.read"), async (req, res, next) => {
  try {
    const salesperson = await prisma.salesPerson.findUnique({
      where: { id: req.params.id },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    if (!salesperson) throw new NotFoundError("Salesperson");
    res.json({ success: true, data: salesperson });
  } catch (error) { next(error); }
});

router.put("/:id", authenticate, requirePermission("salesperson.update"), validate(salespersonSchema.partial().omit({ userId: true })), async (req, res, next) => {
  try {
    const existing = await prisma.salesPerson.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError("Salesperson");

    const salesperson = await prisma.salesPerson.update({
      where: { id: req.params.id },
      data: req.body,
      include: { user: { select: { name: true, email: true } } },
    });

    await audit({ userId: req.user.id, action: "update", entityType: "salesperson", entityId: salesperson.id, newValue: req.body });
    res.json({ success: true, data: salesperson });
  } catch (error) { next(error); }
});

router.delete("/:id", authenticate, requirePermission("salesperson.update"), async (req, res, next) => {
  try {
    const salesperson = await prisma.salesPerson.findUnique({ where: { id: req.params.id } });
    if (!salesperson) throw new NotFoundError("Salesperson");

    await prisma.salesPerson.update({ where: { id: req.params.id }, data: { isActive: false } });
    await audit({ userId: req.user.id, action: "delete", entityType: "salesperson", entityId: req.params.id });
    res.json({ success: true, data: { message: "Salesperson deactivated" } });
  } catch (error) { next(error); }
});

module.exports = router;
