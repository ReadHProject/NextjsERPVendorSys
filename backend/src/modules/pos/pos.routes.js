const express = require("express");
const router = express.Router();
const { z } = require("zod");
const { prisma } = require("../../config/database");
const { paginate, generateInvoiceNumber } = require("../../utils/helpers");
const { authenticate } = require("../../middleware/auth");
const { requirePermission } = require("../../middleware/rbac");
const { validate } = require("../../middleware/validate");
const { NotFoundError, BadRequestError } = require("../../utils/errors");
const { audit } = require("../../middleware/audit");

const sessionOpenSchema = z.object({
  openingCash: z.number().min(0).optional(),
  note: z.string().optional(),
});

const sessionCloseSchema = z.object({
  closingCash: z.number().min(0),
  note: z.string().optional(),
});

const saleCreateSchema = z.object({
  sessionId: z.string().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  paymentMethod: z.enum(["CASH", "UPI", "RAZORPAY", "STRIPE", "COD"]),
  items: z.array(z.object({
    productId: z.string(),
    variantId: z.string().optional(),
    barcode: z.string().optional(),
    name: z.string(),
    sku: z.string(),
    quantity: z.number().int().positive(),
    unitPrice: z.number().nonnegative(),
  })).min(1),
});

router.post("/sessions", authenticate, requirePermission("pos.session.open"), validate(sessionOpenSchema), async (req, res, next) => {
  try {
    const session = await prisma.posSession.create({
      data: {
        userId: req.user.id,
        openingCash: req.body.openingCash || 0,
        note: req.body.note,
      },
    });

    await audit({ userId: req.user.id, action: "open_session", entityType: "pos_session", entityId: session.id, newValue: { openingCash: req.body.openingCash } });
    res.status(201).json({ success: true, data: session });
  } catch (error) { next(error); }
});

router.get("/sessions/:id", authenticate, requirePermission("pos.read"), async (req, res, next) => {
  try {
    const session = await prisma.posSession.findUnique({
      where: { id: req.params.id },
      include: { cashier: { select: { name: true } } },
    });
    if (!session) throw new NotFoundError("POS session");
    res.json({ success: true, data: session });
  } catch (error) { next(error); }
});

router.patch("/sessions/:id/close", authenticate, requirePermission("pos.session.close"), validate(sessionCloseSchema), async (req, res, next) => {
  try {
    const session = await prisma.posSession.findUnique({ where: { id: req.params.id } });
    if (!session) throw new NotFoundError("POS session");
    if (session.closedAt) throw new BadRequestError("Session already closed");

    const updated = await prisma.posSession.update({
      where: { id: req.params.id },
      data: { closingCash: req.body.closingCash, closedAt: new Date(), note: req.body.note || session.note },
    });

    await audit({ userId: req.user.id, action: "close_session", entityType: "pos_session", entityId: req.params.id, newValue: { closingCash: req.body.closingCash } });
    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
});

router.post("/sales", authenticate, requirePermission("pos.create"), validate(saleCreateSchema), async (req, res, next) => {
  try {
    const { sessionId, customerName, customerPhone, paymentMethod, items } = req.body;

    let subtotal = 0;
    let taxTotal = 0;
    const saleItems = items.map((it) => {
      const lineTotal = it.unitPrice * it.quantity;
      subtotal += lineTotal;
      return { ...it, lineTotal };
    });

    const grandTotal = subtotal + taxTotal;

    const sale = await prisma.posSale.create({
      data: {
        sessionId: sessionId || null,
        cashierId: req.user.id,
        customerName,
        customerPhone,
        invoiceNo: generateInvoiceNumber(),
        subtotal,
        taxTotal,
        grandTotal,
        paymentMethod,
        paymentStatus: "PAID",
        items: { create: saleItems.map(({ productId, variantId, barcode, name, sku, quantity, unitPrice, lineTotal }) => ({ productId, variantId, barcode, name, sku, quantity, unitPrice, lineTotal })) },
      },
      include: { items: true },
    });

    await audit({ userId: req.user.id, action: "create", entityType: "pos_sale", entityId: sale.id, newValue: { invoiceNo: sale.invoiceNo, grandTotal: Number(grandTotal) } });
    res.status(201).json({ success: true, data: sale });
  } catch (error) { next(error); }
});

router.get("/sales", authenticate, requirePermission("pos.read"), async (req, res, next) => {
  try {
    const { page, pageSize, skip } = paginate(req.query.page, req.query.pageSize);
    const sessionId = req.query.sessionId || "";

    const where = {
      AND: [
        sessionId ? { sessionId } : {},
      ],
    };

    const [items, total] = await Promise.all([
      prisma.posSale.findMany({
        where,
        include: { items: true, cashier: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.posSale.count({ where }),
    ]);

    res.json({ success: true, data: { items, total, page, pageSize } });
  } catch (error) { next(error); }
});

module.exports = router;
