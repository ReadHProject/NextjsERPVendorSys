const express = require("express");
const router = express.Router();
const { z } = require("zod");
const { prisma } = require("../../config/database");
const { paginate, generateOrderNumber } = require("../../utils/helpers");
const { authenticate } = require("../../middleware/auth");
const { requirePermission } = require("../../middleware/rbac");
const { validate } = require("../../middleware/validate");
const { NotFoundError, BadRequestError } = require("../../utils/errors");
const { audit } = require("../../middleware/audit");

const orderCreateSchema = z.object({
  items: z.array(z.object({
    productId: z.string(),
    variantId: z.string().optional(),
    quantity: z.number().int().positive(),
  })).min(1),
  userId: z.string().optional(),
  salesmanId: z.string().optional(),
  status: z.enum(["DRAFT", "PENDING"]).default("PENDING"),
  shippingAddress: z.object({
    name: z.string(), phone: z.string(), line1: z.string(), line2: z.string().optional(),
    city: z.string(), state: z.string(), pincode: z.string(), country: z.string().default("India"),
  }),
  paymentMethod: z.enum(["CASH", "UPI", "RAZORPAY", "STRIPE", "COD"]).optional(),
  notes: z.string().optional(),
  shippingTotal: z.number().optional(),
  discountTotal: z.number().optional(),
});

const orderStatusSchema = z.object({
  status: z.enum(["DRAFT", "PENDING", "CONFIRMED", "PACKED", "DISPATCHED", "DELIVERED", "CANCELLED", "RETURNED"]),
  note: z.string().optional(),
});

router.get("/", authenticate, async (req, res, next) => {
  try {
    const { page, pageSize, skip } = paginate(req.query.page, req.query.pageSize);
    const isPrivileged = req.user.roles.some((r) => ["SUPER_ADMIN", "ADMIN", "WAREHOUSE_MANAGER", "SALESMAN"].includes(r));
    const status = req.query.status || "";
    const salesmanId = req.query.salesmanId || "";

    const where = {
      AND: [
        isPrivileged ? {} : { userId: req.user.id },
        status ? { status } : {},
        salesmanId ? { salesmanId } : {},
      ],
    };

    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: { items: true, user: { select: { name: true, email: true } }, payments: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.order.count({ where }),
    ]);

    res.json({ success: true, data: { items, total, page, pageSize } });
  } catch (error) { next(error); }
});

router.post("/", authenticate, validate(orderCreateSchema), async (req, res, next) => {
  try {
    const body = req.body;
    const isSalesperson = req.user.roles.some((r) => ["SALESMAN", "ADMIN", "SUPER_ADMIN"].includes(r));
    const isDraft = body.status === "DRAFT";
    let subtotal = 0;
    let taxTotal = 0;
    const orderItems = [];

    for (const it of body.items) {
      const product = await prisma.product.findUnique({ where: { id: it.productId }, include: { variants: true } });
      if (!product) throw new BadRequestError(`Product ${it.productId} not found`);
      const variant = it.variantId ? product.variants.find((v) => v.id === it.variantId) : product.variants[0];
      if (!variant) throw new BadRequestError("Variant not found");

      const unitPrice = Number(variant.price);
      const line = unitPrice * it.quantity;
      subtotal += line;
      taxTotal += (line * Number(product.gstRate)) / 100;
      orderItems.push({
        productId: product.id, variantId: variant.id, sku: variant.sku,
        name: `${product.name}${variant.name !== product.name ? ` - ${variant.name}` : ""}`.trim(),
        quantity: it.quantity, unitPrice, taxRate: Number(product.gstRate),
      });
    }

    const grandTotal = subtotal + taxTotal;
    const order = await prisma.$transaction(async (tx) => {
      const o = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(), userId: body.userId || req.user.id,
          salesmanId: isSalesperson ? (body.salesmanId || req.user.id) : body.salesmanId || null,
          status: isDraft ? "DRAFT" : "PENDING", paymentStatus: "PENDING",
          paymentMethod: body.paymentMethod || null,
          subtotal, taxTotal, grandTotal,
          shippingTotal: body.shippingTotal || 0, discountTotal: body.discountTotal || 0,
          shippingAddress: body.shippingAddress, notes: body.notes,
          items: { create: orderItems },
          statusHistory: { create: { status: isDraft ? "DRAFT" : "PENDING", note: isDraft ? "Draft order" : "Order created" } },
        },
      });
      if (!isDraft) {
        await tx.payment.create({
          data: { orderId: o.id, userId: body.userId || req.user.id, method: body.paymentMethod || "COD", amount: grandTotal },
        });
      }
      return o;
    });

    await audit({ userId: req.user.id, action: isDraft ? "create_draft_order" : "create_order", entityType: "order", entityId: order.id, newValue: { orderNumber: order.orderNumber, total: Number(grandTotal) } });
    res.status(201).json({ success: true, data: order });
  } catch (error) { next(error); }
});

router.get("/:id", authenticate, async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { items: true, user: { select: { name: true, email: true } }, payments: true, statusHistory: true, dispatch: true, returns: true },
    });
    if (!order) throw new NotFoundError("Order");
    res.json({ success: true, data: order });
  } catch (error) { next(error); }
});

router.patch("/:id/status", authenticate, requirePermission("order.update"), validate(orderStatusSchema), async (req, res, next) => {
  try {
    const { status, note } = req.body;
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) throw new NotFoundError("Order");

    const updated = await prisma.$transaction(async (tx) => {
      const o = await tx.order.update({ where: { id: req.params.id }, data: { status } });
      await tx.orderStatusHistory.create({ data: { orderId: req.params.id, status, note: note || `Status changed to ${status}` } });
      return o;
    });

    await audit({ userId: req.user.id, action: "status_change", entityType: "order", entityId: req.params.id, oldValue: { status: order.status }, newValue: { status } });
    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
});

module.exports = router;
