const express = require("express");
const router = express.Router();
const { z } = require("zod");
const { prisma } = require("../../config/database");
const { authenticate } = require("../../middleware/auth");
const { requirePermission } = require("../../middleware/rbac");
const { validate } = require("../../middleware/validate");
const { NotFoundError, BadRequestError } = require("../../utils/errors");
const { audit } = require("../../middleware/audit");

const settingSchema = z.object({
  value: z.any(),
});

router.get("/groups", authenticate, requirePermission("setting.read"), async (req, res, next) => {
  try {
    const configs = await prisma.systemConfig.findMany({ orderBy: { key: "asc" } });
    const groups = configs.reduce((acc, c) => {
      const group = c.key.split(".")[0] || "general";
      if (!acc[group]) acc[group] = [];
      acc[group].push(c);
      return acc;
    }, {});
    res.json({ success: true, data: groups });
  } catch (error) { next(error); }
});

router.get("/", authenticate, requirePermission("setting.read"), async (req, res, next) => {
  try {
    const group = req.query.group || "";
    const where = group ? { key: { startsWith: group } } : {};
    const configs = await prisma.systemConfig.findMany({ where, orderBy: { key: "asc" } });
    res.json({ success: true, data: configs });
  } catch (error) { next(error); }
});

router.get("/:key", authenticate, requirePermission("setting.read"), async (req, res, next) => {
  try {
    const config = await prisma.systemConfig.findUnique({ where: { key: req.params.key } });
    if (!config) throw new NotFoundError("Setting");
    res.json({ success: true, data: config });
  } catch (error) { next(error); }
});

router.put("/:key", authenticate, requirePermission("setting.update"), validate(settingSchema), async (req, res, next) => {
  try {
    const config = await prisma.systemConfig.upsert({
      where: { key: req.params.key },
      update: { value: req.body.value },
      create: { key: req.params.key, value: req.body.value },
    });

    await audit({ userId: req.user.id, action: "update", entityType: "setting", entityId: config.id, newValue: { key: req.params.key, value: req.body.value } });
    res.json({ success: true, data: config });
  } catch (error) { next(error); }
});

module.exports = router;
