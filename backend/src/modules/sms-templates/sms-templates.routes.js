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

const smsTemplateSchema = z.object({
  name: z.string().min(1),
  body: z.string().min(1),
  description: z.string().optional(),
  variables: z.array(z.string()).optional(),
  status: z.boolean().optional(),
});

router.get("/", authenticate, requirePermission("sms.template.read"), async (req, res, next) => {
  try {
    const { page, pageSize, skip } = paginate(req.query.page, req.query.pageSize);

    const configs = await prisma.systemConfig.findMany({
      where: { key: { startsWith: "sms_template." } },
      orderBy: { key: "asc" },
      skip,
      take: pageSize,
    });

    const total = await prisma.systemConfig.count({
      where: { key: { startsWith: "sms_template." } },
    });

    const templates = configs.map((c) => ({ id: c.id, key: c.key.replace("sms_template.", ""), ...c.value }));

    res.json({ success: true, data: { items: templates, total, page, pageSize } });
  } catch (error) { next(error); }
});

router.post("/", authenticate, requirePermission("sms.template.create"), validate(smsTemplateSchema), async (req, res, next) => {
  try {
    const key = `sms_template.${req.body.name.toLowerCase().replace(/\s+/g, "_")}`;
    const existing = await prisma.systemConfig.findUnique({ where: { key } });
    if (existing) throw new BadRequestError("Template already exists");

    const config = await prisma.systemConfig.create({
      data: { key, value: req.body },
    });

    await audit({ userId: req.user.id, action: "create", entityType: "sms_template", entityId: config.id, newValue: { name: req.body.name } });
    res.status(201).json({ success: true, data: { id: config.id, key: config.key, ...req.body } });
  } catch (error) { next(error); }
});

router.get("/:key", authenticate, requirePermission("sms.template.read"), async (req, res, next) => {
  try {
    const key = `sms_template.${req.params.key}`;
    const config = await prisma.systemConfig.findUnique({ where: { key } });
    if (!config) throw new NotFoundError("SMS template");

    res.json({ success: true, data: { id: config.id, key: config.key, ...config.value } });
  } catch (error) { next(error); }
});

router.put("/:key", authenticate, requirePermission("sms.template.update"), validate(smsTemplateSchema), async (req, res, next) => {
  try {
    const key = `sms_template.${req.params.key}`;
    const existing = await prisma.systemConfig.findUnique({ where: { key } });
    if (!existing) throw new NotFoundError("SMS template");

    const config = await prisma.systemConfig.update({
      where: { key },
      data: { value: req.body },
    });

    await audit({ userId: req.user.id, action: "update", entityType: "sms_template", entityId: config.id, newValue: req.body });
    res.json({ success: true, data: { id: config.id, key: config.key, ...req.body } });
  } catch (error) { next(error); }
});

router.delete("/:key", authenticate, requirePermission("sms.template.delete"), async (req, res, next) => {
  try {
    const key = `sms_template.${req.params.key}`;
    const existing = await prisma.systemConfig.findUnique({ where: { key } });
    if (!existing) throw new NotFoundError("SMS template");

    await prisma.systemConfig.delete({ where: { key } });
    await audit({ userId: req.user.id, action: "delete", entityType: "sms_template", entityId: existing.id });
    res.json({ success: true, data: { message: "SMS template deleted" } });
  } catch (error) { next(error); }
});

module.exports = router;
