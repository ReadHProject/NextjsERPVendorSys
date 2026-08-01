const express = require("express");
const router = express.Router();
const { z } = require("zod");
const { prisma } = require("../../config/database");
const { paginate, generatePONumber } = require("../../utils/helpers");
const { authenticate } = require("../../middleware/auth");
const { requirePermission } = require("../../middleware/rbac");
const { validate } = require("../../middleware/validate");
const { NotFoundError, BadRequestError } = require("../../utils/errors");
const { audit } = require("../../middleware/audit");
const { upload } = require("../../middleware/upload");

const poCreateSchema = z.object({
  supplierId: z.string(),
  warehouseId: z.string(),
  expectedDate: z.string().nullable().optional(),
  supplierInvoiceNumber: z.string().nullable().optional(),
  supplierInvoiceDate: z.string().nullable().optional(),
  invoiceFile: z.string().nullable().optional(),
  transportCost: z.number().optional(),
  extraMargin: z.number().optional(),
  marginType: z.enum(["PERCENTAGE", "FIXED"]).nullable().optional(),
  payableAmount: z.number().optional(),
  notes: z.string().nullable().optional(),
  status: z.enum(["DRAFT", "SUBMITTED"]).optional(),
  items: z.array(z.object({
    productId: z.string(),
    variantId: z.string().nullable().optional(),
    barcode: z.string().nullable().optional(),
    quantity: z.number().int().positive(),
    actualQty: z.number().int().optional(),
    billedQty: z.number().int().optional(),
    packSize: z.number().int().positive().optional(),
    unitCost: z.number(),
    preGstRate: z.number().optional(),
    preGstAmount: z.number().optional(),
    discountPercent: z.number().optional(),
    additionalDiscountPercent: z.number().optional(),
    gstPercent: z.number().optional(),
    gstAmount: z.number().optional(),
    transportCost: z.number().optional(),
    finalAmount: z.number().optional(),
  })).min(1),
});

const poStatusSchema = z.object({
  status: z.enum(["DRAFT", "SUBMITTED", "APPROVED", "ORDERED", "PARTIAL_RECEIVED", "RECEIVED", "CANCELLED"]),
  note: z.string().optional(),
});

const poReceiveSchema = z.object({
  items: z.array(z.object({
    purchaseOrderId: z.string(),
    productId: z.string(),
    variantId: z.string().optional(),
    quantity: z.number().int().positive(),
    warehouseId: z.string(),
    batchNumber: z.string().optional(),
  })).min(1),
});

function calculateTotals(items, transportCost = 0, extraMargin = 0, marginType = "PERCENTAGE") {
  let subtotal = 0;
  let taxTotal = 0;
  let grandTotal = 0;

  const calculatedItems = items.map((it) => {
    const rate = it.preGstRate;
    const qty = it.actualQty;
    const preGstAmount = rate * qty;
    const discPct = it.discountPercent || 0;
    const addDiscPct = it.additionalDiscountPercent || 0;
    const totalDiscPct = discPct + addDiscPct;
    const discountAmount = preGstAmount * (totalDiscPct / 100);
    const afterDiscount = preGstAmount - discountAmount;
    const gstPct = it.gstPercent || 0;
    const gstAmount = afterDiscount * (gstPct / 100);
    const itemTransport = it.itemTransportCost || 0;
    const finalAmount = afterDiscount + gstAmount + itemTransport;

    subtotal += preGstAmount;
    taxTotal += gstAmount;

    return {
      productId: it.productId,
      variantId: it.variantId || null,
      barcode: it.barcode || null,
      actualQty: qty,
      billedQty: it.billedQty || qty,
      packSize: it.packSize || 1,
      receivedQty: 0,
      preGstRate: rate,
      preGstAmount,
      discountPercent: discPct,
      additionalDiscountPercent: addDiscPct,
      gstPercent: gstPct,
      gstAmount,
      itemTransportCost: itemTransport,
      finalAmount,
    };
  });

  grandTotal = subtotal + taxTotal + transportCost;

  let payableAmount;
  if (marginType === "FIXED") {
    payableAmount = grandTotal + extraMargin;
  } else {
    payableAmount = (subtotal + transportCost) * (1 + extraMargin / 100);
  }

  return { calculatedItems, subtotal, taxTotal, grandTotal, payableAmount };
}

router.get("/", authenticate, requirePermission("purchase.order.read"), async (req, res, next) => {
  try {
    const { page, pageSize, skip } = paginate(req.query.page, req.query.pageSize);
    const status = req.query.status || "";
    const supplierId = req.query.supplier || req.query.supplierId || "";
    const invoiceNo = req.query.invoiceNo || "";
    const dateFrom = req.query.dateFrom || "";
    const dateTo = req.query.dateTo || "";

    const where = {
      AND: [
        status ? { status } : {},
        supplierId ? { supplierId } : {},
        invoiceNo ? { supplierInvoiceNumber: { contains: invoiceNo, mode: 'insensitive' } } : {},
        dateFrom || dateTo ? {
          supplierInvoiceDate: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo) } : {})
          }
        } : {}
      ],
    };

    const [items, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        include: { supplier: true, warehouse: true, createdBy: { select: { name: true } }, items: { include: { product: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.purchaseOrder.count({ where }),
    ]);

    res.json({ success: true, data: { items, total, page, pageSize } });
  } catch (error) { next(error); }
});

router.post("/", authenticate, requirePermission("purchase.order.create"), validate(poCreateSchema), async (req, res, next) => {
  try {
    const { supplierId, warehouseId, expectedDate, supplierInvoiceNumber, supplierInvoiceDate, invoiceFile, transportCost = 0, extraMargin = 0, marginType = "PERCENTAGE", payableAmount = 0, notes, status = "DRAFT", items } = req.body;

    let subtotal = 0;
    const poItems = items.map((it) => {
      const lineTotal = it.finalAmount ?? (it.unitCost * it.quantity);
      subtotal += lineTotal;
      return { 
        ...it, 
        lineTotal, 
        actualQty: it.actualQty ?? it.quantity,
        billedQty: it.billedQty ?? it.quantity,
        preGstRate: it.preGstRate ?? it.unitCost,
        finalAmount: lineTotal
      };
    });

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber: generatePONumber(),
        supplierId,
        warehouseId,
        expectedDate: expectedDate ? new Date(expectedDate) : null,
        supplierInvoiceNumber,
        supplierInvoiceDate: supplierInvoiceDate ? new Date(supplierInvoiceDate) : null,
        invoiceFile,
        transportCost,
        extraMargin,
        marginType,
        payableAmount,
        notes,
        subtotal,
        grandTotal: subtotal,
        createdById: req.user.id,
        status: status,
        items: { 
          create: poItems.map((it) => ({ 
            productId: it.productId, 
            variantId: it.variantId, 
            barcode: it.barcode,
            quantity: it.quantity, 
            actualQty: it.actualQty,
            billedQty: it.billedQty,
            packSize: it.packSize,
            unitCost: it.unitCost, 
            preGstRate: it.preGstRate,
            preGstAmount: it.preGstAmount,
            discountPercent: it.discountPercent,
            additionalDiscountPercent: it.additionalDiscountPercent,
            gstPercent: it.gstPercent,
            gstAmount: it.gstAmount,
            transportCost: it.transportCost,
            finalAmount: it.finalAmount,
            lineTotal: it.lineTotal 
          })) 
        },
      },
      include: { supplier: true, warehouse: true, items: true },
    });

    await audit({ userId: req.user.id, action: "create", entityType: "purchase_order", entityId: po.id, newValue: { poNumber: po.poNumber, grandTotal: Number(po.grandTotal) } });
    res.status(201).json({ success: true, data: po });
  } catch (error) { next(error); }
});

router.get("/:id", authenticate, requirePermission("purchase.order.read"), async (req, res, next) => {
  try {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: req.params.id },
      include: { supplier: true, warehouse: true, createdBy: { select: { name: true } }, approvedBy: { select: { name: true } }, items: { include: { product: true, variant: true } } },
    });
    if (!po) throw new NotFoundError("Purchase order");
    res.json({ success: true, data: po });
  } catch (error) { next(error); }
});

router.put("/:id", authenticate, requirePermission("purchase.order.update"), validate(poCreateSchema.partial()), async (req, res, next) => {
  try {
    const existing = await prisma.purchaseOrder.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError("Purchase order");
    if (!["DRAFT", "SUBMITTED"].includes(existing.status)) throw new BadRequestError("Cannot edit non-draft PO");

    const { items, supplierInvoiceDate, expectedDate, ...data } = req.body;
    
    // Convert dates if provided
    if (supplierInvoiceDate) data.supplierInvoiceDate = new Date(supplierInvoiceDate);
    if (expectedDate) data.expectedDate = new Date(expectedDate);

    const po = await prisma.$transaction(async (tx) => {
      if (items) {
        await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: req.params.id } });
        let subtotal = 0;
        for (const it of items) {
          const lineTotal = it.finalAmount ?? (it.unitCost * it.quantity);
          subtotal += lineTotal;
          await tx.purchaseOrderItem.create({
            data: { 
              purchaseOrderId: req.params.id, 
              productId: it.productId, 
              variantId: it.variantId, 
              barcode: it.barcode,
              quantity: it.quantity, 
              actualQty: it.actualQty ?? it.quantity,
              billedQty: it.billedQty ?? it.quantity,
              packSize: it.packSize,
              unitCost: it.unitCost, 
              preGstRate: it.preGstRate ?? it.unitCost,
              preGstAmount: it.preGstAmount,
              discountPercent: it.discountPercent,
              additionalDiscountPercent: it.additionalDiscountPercent,
              gstPercent: it.gstPercent,
              gstAmount: it.gstAmount,
              transportCost: it.transportCost,
              finalAmount: lineTotal,
              lineTotal 
            },
          });
        }
        await tx.purchaseOrder.update({ where: { id: req.params.id }, data: { ...data, subtotal, grandTotal: subtotal } });
      } else {
        await tx.purchaseOrder.update({ where: { id: req.params.id }, data });
      }
      return tx.purchaseOrder.findUnique({ where: { id: req.params.id }, include: { items: true } });
    });

    await audit({ userId: req.user.id, action: "update", entityType: "purchase_order", entityId: po.id, newValue: data });
    res.json({ success: true, data: po });
  } catch (error) { next(error); }
});

router.patch("/:id/status", authenticate, requirePermission("purchase.order.update"), validate(poStatusSchema), async (req, res, next) => {
  try {
    const { status, note } = req.body;
    const po = await prisma.purchaseOrder.findUnique({ where: { id: req.params.id } });
    if (!po) throw new NotFoundError("Purchase order");

    const updated = await prisma.purchaseOrder.update({
      where: { id: req.params.id },
      data: { status },
    });

    await audit({ userId: req.user.id, action: "status_change", entityType: "purchase_order", entityId: req.params.id, oldValue: { status: po.status }, newValue: { status } });
    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
});

router.patch("/:id/approve", authenticate, requirePermission("purchase.order.approve"), async (req, res, next) => {
  try {
    const po = await prisma.purchaseOrder.findUnique({ where: { id: req.params.id } });
    if (!po) throw new NotFoundError("Purchase order");
    if (po.status !== "SUBMITTED") throw new BadRequestError("PO must be submitted before approval");

    const updated = await prisma.purchaseOrder.update({
      where: { id: req.params.id },
      data: { status: "APPROVED", approvedById: req.user.id },
    });

    await audit({ userId: req.user.id, action: "approve", entityType: "purchase_order", entityId: req.params.id });
    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
});

router.post("/:id/receive", authenticate, requirePermission("purchase.order.receive"), validate(poReceiveSchema), async (req, res, next) => {
  try {
    const po = await prisma.purchaseOrder.findUnique({ where: { id: req.params.id }, include: { items: true } });
    if (!po) throw new NotFoundError("Purchase order");
    if (!["APPROVED", "ORDERED", "PARTIAL_RECEIVED"].includes(po.status)) throw new BadRequestError("PO cannot be received in current status");

    const { items } = req.body;

    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        const existingInventory = await tx.inventory.findFirst({
          where: { 
            productId: item.productId, 
            variantId: item.variantId || null, 
            warehouseId: item.warehouseId, 
            batchNumber: item.batchNumber || null 
          }
        });

        if (existingInventory) {
          await tx.inventory.update({
            where: { id: existingInventory.id },
            data: { quantity: { increment: item.quantity } },
          });
        } else {
          await tx.inventory.create({
            data: { 
              productId: item.productId, 
              variantId: item.variantId || null, 
              warehouseId: item.warehouseId, 
              batchNumber: item.batchNumber || null, 
              quantity: item.quantity 
            },
          });
        }

        await tx.inventoryMovement.create({
          data: { productId: item.productId, variantId: item.variantId || null, warehouseId: item.warehouseId, type: "PURCHASE", quantity: item.quantity, purchaseOrderId: req.params.id, reference: po.poNumber },
        });
      }

      const totalReceived = items.reduce((sum, i) => sum + i.quantity, 0);
      const allReceived = po.items.every((poi) => {
        const received = items.filter((i) => i.productId === poi.productId).reduce((s, i) => s + i.quantity, 0);
        return poi.actualQty <= received;
      });

      await tx.purchaseOrder.update({
        where: { id: req.params.id },
        data: { status: allReceived ? "RECEIVED" : "PARTIAL_RECEIVED", receivedAt: allReceived ? new Date() : undefined },
      });
    });

    await audit({ userId: req.user.id, action: "receive", entityType: "purchase_order", entityId: req.params.id, newValue: { itemCount: items.length } });
    res.json({ success: true, data: { message: "Inventory received successfully" } });
  } catch (error) { next(error); }
});

router.post("/:id/upload-invoice", authenticate, requirePermission("purchase.order.update"), upload.single("invoice"), async (req, res, next) => {
  try {
    const po = await prisma.purchaseOrder.findUnique({ where: { id: req.params.id } });
    if (!po) throw new NotFoundError("Purchase order");

    const filePath = `/uploads/${req.file.filename}`;
    const updated = await prisma.purchaseOrder.update({
      where: { id: req.params.id },
      data: { invoiceFile: filePath },
    });

    await audit({ userId: req.user.id, action: "upload_invoice", entityType: "purchase_order", entityId: req.params.id });
    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
});

module.exports = router;
