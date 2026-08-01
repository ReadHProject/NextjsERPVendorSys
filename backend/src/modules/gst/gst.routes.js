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

const gstFilingSchema = z.object({
  period: z.string().min(1),
  filingDate: z.string(),
  totalSales: z.number().nonnegative(),
  totalPurchase: z.number().nonnegative(),
  totalTaxCollected: z.number().nonnegative(),
  totalTaxPaid: z.number().nonnegative(),
  status: z.enum(["DRAFT", "FILED", "REVISED"]).default("DRAFT"),
  notes: z.string().optional(),
});

router.get("/filings", authenticate, requirePermission("gst.read"), async (req, res, next) => {
  try {
    const { page, pageSize, skip } = paginate(req.query.page, req.query.pageSize);
    const status = req.query.status || "";

    const where = {
      AND: [
        status ? { status } : {},
      ],
    };

    const configs = await prisma.systemConfig.findMany({
      where: { key: { startsWith: "gst." } },
      orderBy: { key: "asc" },
    });

    const filings = configs
      .filter((c) => c.value && c.value.period)
      .map((c) => ({ id: c.id, key: c.key, ...c.value }));

    const filtered = status ? filings.filter((f) => f.status === status) : filings;
    const paginated = filtered.slice(skip, skip + pageSize);

    res.json({ success: true, data: { items: paginated, total: filtered.length, page, pageSize } });
  } catch (error) { next(error); }
});

router.post("/filings", authenticate, requirePermission("gst.create"), validate(gstFilingSchema), async (req, res, next) => {
  try {
    const key = `gst.filing.${req.body.period}`;
    const existing = await prisma.systemConfig.findUnique({ where: { key } });
    if (existing) throw new BadRequestError("Filing already exists for this period");

    const config = await prisma.systemConfig.create({
      data: { key, value: req.body },
    });

    await audit({ userId: req.user.id, action: "create", entityType: "gst_filing", entityId: config.id, newValue: { period: req.body.period } });
    res.status(201).json({ success: true, data: { id: config.id, key: config.key, ...req.body } });
  } catch (error) { next(error); }
});

router.get("/filings/:id", authenticate, requirePermission("gst.read"), async (req, res, next) => {
  try {
    const config = await prisma.systemConfig.findUnique({ where: { id: req.params.id } });
    if (!config) throw new NotFoundError("GST filing");

    res.json({ success: true, data: { id: config.id, key: config.key, ...config.value } });
  } catch (error) { next(error); }
});

router.get("/summary", authenticate, requirePermission("gst.read"), async (req, res, next) => {
  try {
    const configs = await prisma.systemConfig.findMany({
      where: { key: { startsWith: "gst." } },
    });

    const filings = configs.filter((c) => c.value && c.value.period);
    const totalFiled = filings.filter((f) => f.value.status === "FILED").length;
    const totalTaxCollected = filings.reduce((sum, f) => sum + (f.value.totalTaxCollected || 0), 0);
    const totalTaxPaid = filings.reduce((sum, f) => sum + (f.value.totalTaxPaid || 0), 0);

    res.json({
      success: true,
      data: {
        totalFilings: filings.length,
        totalFiled,
        totalTaxCollected,
        totalTaxPaid,
        netTax: totalTaxCollected - totalTaxPaid,
      },
    });
  } catch (error) { next(error); }
});

router.get("/hsn", authenticate, requirePermission("gst.read"), async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      where: { gstRate: { gt: 0 } },
      select: { name: true, gstRate: true, slug: true },
      orderBy: { name: "asc" },
      take: 100,
    });

    const hsnGroups = products.reduce((acc, p) => {
      const rate = Number(p.gstRate);
      if (!acc[rate]) acc[rate] = [];
      acc[rate].push(p);
      return acc;
    }, {});

    res.json({ success: true, data: hsnGroups });
  } catch (error) { next(error); }
});

module.exports = router;
