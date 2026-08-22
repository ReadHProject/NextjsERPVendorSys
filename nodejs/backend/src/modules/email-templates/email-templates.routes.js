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

const emailTemplateSchema = z.object({
  name: z.string().min(1),
  subject: z.string().min(1),
  body: z.string().min(1),
  description: z.string().optional(),
  variables: z.array(z.string()).optional(),
  status: z.boolean().optional(),
});

router.get("/", authenticate, requirePermission("email.template.read"), async (req, res, next) => {
  try {
    const { page, pageSize, skip } = paginate(req.query.page, req.query.pageSize);
    const q = req.query.q || "";

    const where = {
      AND: [
        q ? { name: { contains: q, mode: "insensitive" } } : {},
      ],
    };

    const configs = await prisma.systemConfig.findMany({
      where: { key: { startsWith: "email_template." }, ...where },
      orderBy: { key: "asc" },
      skip,
      take: pageSize,
    });

    const total = await prisma.systemConfig.count({
      where: { key: { startsWith: "email_template." } },
    });

    const templates = configs.map((c) => ({ id: c.id, key: c.key.replace("email_template.", ""), ...c.value }));

    res.json({ success: true, data: { items: templates, total, page, pageSize } });
  } catch (error) { next(error); }
});

router.post("/", authenticate, requirePermission("email.template.create"), validate(emailTemplateSchema), async (req, res, next) => {
  try {
    const key = `email_template.${req.body.name.toLowerCase().replace(/\s+/g, "_")}`;
    const existing = await prisma.systemConfig.findUnique({ where: { key } });
    if (existing) throw new BadRequestError("Template already exists");

    const config = await prisma.systemConfig.create({
      data: { key, value: req.body },
    });

    await audit({ userId: req.user.id, action: "create", entityType: "email_template", entityId: config.id, newValue: { name: req.body.name } });
    res.status(201).json({ success: true, data: { id: config.id, key: config.key, ...req.body } });
  } catch (error) { next(error); }
});

router.get("/:key", authenticate, requirePermission("email.template.read"), async (req, res, next) => {
  try {
    const key = `email_template.${req.params.key}`;
    const config = await prisma.systemConfig.findUnique({ where: { key } });
    if (!config) throw new NotFoundError("Email template");

    res.json({ success: true, data: { id: config.id, key: config.key, ...config.value } });
  } catch (error) { next(error); }
});

router.put("/:key", authenticate, requirePermission("email.template.update"), validate(emailTemplateSchema), async (req, res, next) => {
  try {
    const key = `email_template.${req.params.key}`;
    const existing = await prisma.systemConfig.findUnique({ where: { key } });
    if (!existing) throw new NotFoundError("Email template");

    const config = await prisma.systemConfig.update({
      where: { key },
      data: { value: req.body },
    });

    await audit({ userId: req.user.id, action: "update", entityType: "email_template", entityId: config.id, newValue: req.body });
    res.json({ success: true, data: { id: config.id, key: config.key, ...req.body } });
  } catch (error) { next(error); }
});

router.delete("/:key", authenticate, requirePermission("email.template.delete"), async (req, res, next) => {
  try {
    const key = `email_template.${req.params.key}`;
    const existing = await prisma.systemConfig.findUnique({ where: { key } });
    if (!existing) throw new NotFoundError("Email template");

    await prisma.systemConfig.delete({ where: { key } });
    await audit({ userId: req.user.id, action: "delete", entityType: "email_template", entityId: existing.id });
    res.json({ success: true, data: { message: "Email template deleted" } });
  } catch (error) { next(error); }
});

module.exports = router;
