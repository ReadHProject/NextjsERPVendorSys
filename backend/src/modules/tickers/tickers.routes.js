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

const tickerSchema = z.object({
  message: z.string().min(1),
  type: z.enum(["INFO", "WARNING", "SUCCESS"]).default("INFO"),
  link: z.string().optional(),
  status: z.boolean().optional(),
});

router.get("/", authenticate, requirePermission("ticker.read"), async (req, res, next) => {
  try {
    const tickers = await prisma.tickerMessage.findMany({ orderBy: { createdAt: "desc" } });
    res.json({ success: true, data: tickers });
  } catch (error) { next(error); }
});

router.get("/public", async (req, res, next) => {
  try {
    const tickers = await prisma.tickerMessage.findMany({
      where: { status: true },
      orderBy: { createdAt: "desc" },
      select: { id: true, message: true, type: true, link: true },
    });
    res.json({ success: true, data: tickers });
  } catch (error) { next(error); }
});

router.post("/", authenticate, requirePermission("ticker.create"), validate(tickerSchema), async (req, res, next) => {
  try {
    const ticker = await prisma.tickerMessage.create({ data: req.body });
    await audit({ userId: req.user.id, action: "create", entityType: "ticker", entityId: ticker.id, newValue: { message: ticker.message } });
    res.status(201).json({ success: true, data: ticker });
  } catch (error) { next(error); }
});

router.get("/:id", authenticate, requirePermission("ticker.read"), async (req, res, next) => {
  try {
    const ticker = await prisma.tickerMessage.findUnique({ where: { id: req.params.id } });
    if (!ticker) throw new NotFoundError("Ticker message");
    res.json({ success: true, data: ticker });
  } catch (error) { next(error); }
});

router.put("/:id", authenticate, requirePermission("ticker.update"), validate(tickerSchema), async (req, res, next) => {
  try {
    const existing = await prisma.tickerMessage.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError("Ticker message");

    const ticker = await prisma.tickerMessage.update({ where: { id: req.params.id }, data: req.body });
    await audit({ userId: req.user.id, action: "update", entityType: "ticker", entityId: ticker.id, newValue: req.body });
    res.json({ success: true, data: ticker });
  } catch (error) { next(error); }
});

router.delete("/:id", authenticate, requirePermission("ticker.delete"), async (req, res, next) => {
  try {
    const ticker = await prisma.tickerMessage.findUnique({ where: { id: req.params.id } });
    if (!ticker) throw new NotFoundError("Ticker message");

    await prisma.tickerMessage.delete({ where: { id: req.params.id } });
    await audit({ userId: req.user.id, action: "delete", entityType: "ticker", entityId: req.params.id });
    res.json({ success: true, data: { message: "Ticker deleted" } });
  } catch (error) { next(error); }
});

module.exports = router;
