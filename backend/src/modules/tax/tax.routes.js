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

const taxRuleSchema = z.object({
  name: z.string().min(1),
  rate: z.number().min(0).max(100),
  type: z.string().optional(),
  hsnCode: z.string().optional(),
  description: z.string().optional(),
  status: z.boolean().optional(),
});

const taxCalculateSchema = z.object({
  amount: z.number().nonnegative(),
  taxRate: z.number().min(0).max(100).optional(),
  hsnCode: z.string().optional(),
});

router.get("/", authenticate, requirePermission("tax.read"), async (req, res, next) => {
  try {
    const { page, pageSize, skip } = paginate(req.query.page, req.query.pageSize);
    const q = req.query.q || "";

    const where = {
      AND: [
        q ? { name: { contains: q, mode: "insensitive" } } : {},
      ],
    };

    const [items, total] = await Promise.all([
      prisma.systemConfig.findMany({
        where: { key: { startsWith: "tax." } },
        orderBy: { key: "asc" },
        skip,
        take: pageSize,
      }),
      prisma.systemConfig.count({ where: { key: { startsWith: "tax." } } }),
    ]);

    res.json({ success: true, data: { items, total, page, pageSize } });
  } catch (error) { next(error); }
});

router.post("/", authenticate, requirePermission("tax.create"), validate(taxRuleSchema), async (req, res, next) => {
  try {
    const key = `tax.${req.body.name.toLowerCase().replace(/\s+/g, "_")}`;
    const existing = await prisma.systemConfig.findUnique({ where: { key } });
    if (existing) throw new BadRequestError("Tax rule already exists");

    const config = await prisma.systemConfig.create({
      data: { key, value: req.body },
    });

    await audit({ userId: req.user.id, action: "create", entityType: "tax_rule", entityId: config.id, newValue: { name: req.body.name, rate: req.body.rate } });
    res.status(201).json({ success: true, data: { id: config.id, key: config.key, ...req.body } });
  } catch (error) { next(error); }
});

router.put("/:key", authenticate, requirePermission("tax.update"), validate(taxRuleSchema), async (req, res, next) => {
  try {
    const key = req.params.key.startsWith("tax.") ? req.params.key : `tax.${req.params.key}`;
    const existing = await prisma.systemConfig.findUnique({ where: { key } });
    if (!existing) throw new NotFoundError("Tax rule");

    const config = await prisma.systemConfig.update({
      where: { key },
      value: req.body,
    });

    await audit({ userId: req.user.id, action: "update", entityType: "tax_rule", entityId: config.id, newValue: req.body });
    res.json({ success: true, data: { id: config.id, key: config.key, ...req.body } });
  } catch (error) { next(error); }
});

router.delete("/:key", authenticate, requirePermission("tax.delete"), async (req, res, next) => {
  try {
    const key = req.params.key.startsWith("tax.") ? req.params.key : `tax.${req.params.key}`;
    const existing = await prisma.systemConfig.findUnique({ where: { key } });
    if (!existing) throw new NotFoundError("Tax rule");

    await prisma.systemConfig.delete({ where: { key } });
    await audit({ userId: req.user.id, action: "delete", entityType: "tax_rule", entityId: existing.id });
    res.json({ success: true, data: { message: "Tax rule deleted" } });
  } catch (error) { next(error); }
});

router.get("/calculate", authenticate, requirePermission("tax.calculate"), validate(taxCalculateSchema), async (req, res, next) => {
  try {
    const { amount, taxRate, hsnCode } = req.body;
    let rate = taxRate;

    if (!rate && hsnCode) {
      const taxConfig = await prisma.systemConfig.findFirst({
        where: { key: { startsWith: "tax." }, value: { path: ["hsnCode"], equals: hsnCode } },
      });
      if (taxConfig) rate = taxConfig.value.rate;
    }

    rate = rate || 0;
    const taxAmount = amount * (rate / 100);
    const total = amount + taxAmount;

    res.json({
      success: true,
      data: { amount, taxRate: rate, taxAmount, total },
    });
  } catch (error) { next(error); }
});

module.exports = router;
