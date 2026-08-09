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

const supplierSchema = z.object({
  code: z.string().optional(),
  companyName: z.string().min(1),
  contactName: z.string().optional(),
  gstin: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  phone2: z.string().optional(),
  address: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  pincode: z.string().optional(),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  ifsc: z.string().optional(),
  accountHolderName: z.string().optional(),
  creditDays: z.number().int().min(0).optional(),
  openingBalance: z.number().optional(),
  balanceType: z.string().optional(),
  dealerMargin: z.number().optional(),
  wholesalerMargin: z.number().optional(),
  retailMargin: z.number().optional(),
  parlourMargin: z.number().optional(),
  onlineMargin: z.number().optional(),
  status: z.boolean().optional(),
});

const supplierTxnSchema = z.object({
  type: z.enum(["PURCHASE", "PAYMENT", "ADJUSTMENT"]),
  amount: z.number(),
  reference: z.string().optional(),
  note: z.string().optional(),
});

router.get("/", authenticate, requirePermission("supplier.read"), async (req, res, next) => {
  try {
    const { page, pageSize, skip } = paginate(req.query.page, req.query.pageSize);
    const q = req.query.q || "";

    const where = {
      AND: [
        q ? { companyName: { contains: q, mode: "insensitive" } } : {},
      ],
    };

    const [items, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        include: { _count: { select: { transactions: true, purchaseOrders: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.supplier.count({ where }),
    ]);

    res.json({ success: true, data: { items, total, page, pageSize } });
  } catch (error) { next(error); }
});

router.post("/", authenticate, requirePermission("supplier.create"), validate(supplierSchema), async (req, res, next) => {
  try {
    const data = { ...req.body };
    if (!data.code) {
      const count = await prisma.supplier.count();
      data.code = `SUP${String(count + 1).padStart(4, "0")}`;
    }
    const supplier = await prisma.supplier.create({ data });
    await audit({ userId: req.user.id, action: "create", entityType: "supplier", entityId: supplier.id, newValue: { companyName: supplier.companyName } });
    res.status(201).json({ success: true, data: supplier });
  } catch (error) { next(error); }
});

router.get("/:id", authenticate, requirePermission("supplier.read"), async (req, res, next) => {
  try {
    const supplier = await prisma.supplier.findUnique({
      where: { id: req.params.id },
      include: { transactions: true, purchaseOrders: { take: 10, orderBy: { createdAt: "desc" } } },
    });
    if (!supplier) throw new NotFoundError("Supplier");
    res.json({ success: true, data: supplier });
  } catch (error) { next(error); }
});

router.put("/:id", authenticate, requirePermission("supplier.update"), validate(supplierSchema), async (req, res, next) => {
  try {
    const existing = await prisma.supplier.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError("Supplier");

    const supplier = await prisma.supplier.update({ where: { id: req.params.id }, data: req.body });
    await audit({ userId: req.user.id, action: "update", entityType: "supplier", entityId: supplier.id, newValue: req.body });
    res.json({ success: true, data: supplier });
  } catch (error) { next(error); }
});

router.delete("/:id", authenticate, requirePermission("supplier.delete"), async (req, res, next) => {
  try {
    const supplier = await prisma.supplier.findUnique({ where: { id: req.params.id }, include: { _count: { select: { purchaseOrders: true } } } });
    if (!supplier) throw new NotFoundError("Supplier");
    if (supplier._count.purchaseOrders > 0) throw new BadRequestError("Cannot delete supplier with purchase orders");

    await prisma.supplier.delete({ where: { id: req.params.id } });
    await audit({ userId: req.user.id, action: "delete", entityType: "supplier", entityId: req.params.id });
    res.json({ success: true, data: { message: "Supplier deleted" } });
  } catch (error) { next(error); }
});

router.get("/:id/transactions", authenticate, requirePermission("supplier.txn.read"), async (req, res, next) => {
  try {
    const { page, pageSize, skip } = paginate(req.query.page, req.query.pageSize);
    const supplier = await prisma.supplier.findUnique({ where: { id: req.params.id } });
    if (!supplier) throw new NotFoundError("Supplier");

    const [items, total] = await Promise.all([
      prisma.supplierTransaction.findMany({
        where: { supplierId: req.params.id },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.supplierTransaction.count({ where: { supplierId: req.params.id } }),
    ]);

    res.json({ success: true, data: { items, total, page, pageSize } });
  } catch (error) { next(error); }
});

router.post("/:id/transactions", authenticate, requirePermission("supplier.txn.create"), validate(supplierTxnSchema), async (req, res, next) => {
  try {
    const supplier = await prisma.supplier.findUnique({ where: { id: req.params.id } });
    if (!supplier) throw new NotFoundError("Supplier");

    const transaction = await prisma.supplierTransaction.create({
      data: { supplierId: req.params.id, ...req.body },
    });

    await audit({ userId: req.user.id, action: "create", entityType: "supplier_transaction", entityId: transaction.id, newValue: { supplierId: req.params.id, type: req.body.type, amount: req.body.amount } });
    res.status(201).json({ success: true, data: transaction });
  } catch (error) { next(error); }
});

module.exports = router;
