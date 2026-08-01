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

const sliderSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().optional(),
  image: z.string().min(1),
  buttonText: z.string().optional(),
  url: z.string().optional(),
  sortOrder: z.number().int().optional(),
  status: z.boolean().optional(),
});

router.get("/", authenticate, requirePermission("slider.read"), async (req, res, next) => {
  try {
    const sliders = await prisma.slider.findMany({ orderBy: { sortOrder: "asc" } });
    res.json({ success: true, data: sliders });
  } catch (error) { next(error); }
});

router.get("/public", async (req, res, next) => {
  try {
    const sliders = await prisma.slider.findMany({
      where: { status: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, title: true, subtitle: true, image: true, buttonText: true, url: true },
    });
    res.json({ success: true, data: sliders });
  } catch (error) { next(error); }
});

router.post("/", authenticate, requirePermission("slider.create"), validate(sliderSchema), async (req, res, next) => {
  try {
    const slider = await prisma.slider.create({ data: req.body });
    await audit({ userId: req.user.id, action: "create", entityType: "slider", entityId: slider.id, newValue: { title: slider.title } });
    res.status(201).json({ success: true, data: slider });
  } catch (error) { next(error); }
});

router.get("/:id", authenticate, requirePermission("slider.read"), async (req, res, next) => {
  try {
    const slider = await prisma.slider.findUnique({ where: { id: req.params.id } });
    if (!slider) throw new NotFoundError("Slider");
    res.json({ success: true, data: slider });
  } catch (error) { next(error); }
});

router.put("/:id", authenticate, requirePermission("slider.update"), validate(sliderSchema), async (req, res, next) => {
  try {
    const existing = await prisma.slider.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError("Slider");

    const slider = await prisma.slider.update({ where: { id: req.params.id }, data: req.body });
    await audit({ userId: req.user.id, action: "update", entityType: "slider", entityId: slider.id, newValue: req.body });
    res.json({ success: true, data: slider });
  } catch (error) { next(error); }
});

router.delete("/:id", authenticate, requirePermission("slider.delete"), async (req, res, next) => {
  try {
    const slider = await prisma.slider.findUnique({ where: { id: req.params.id } });
    if (!slider) throw new NotFoundError("Slider");

    await prisma.slider.delete({ where: { id: req.params.id } });
    await audit({ userId: req.user.id, action: "delete", entityType: "slider", entityId: req.params.id });
    res.json({ success: true, data: { message: "Slider deleted" } });
  } catch (error) { next(error); }
});

module.exports = router;
