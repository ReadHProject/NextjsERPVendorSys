const express = require("express");
const router = express.Router();
const { z } = require("zod");
const { prisma } = require("../../config/database");
const { paginate, makeSlug } = require("../../utils/helpers");
const { authenticate } = require("../../middleware/auth");
const { requirePermission } = require("../../middleware/rbac");
const { validate } = require("../../middleware/validate");
const { NotFoundError, BadRequestError } = require("../../utils/errors");
const { audit } = require("../../middleware/audit");

const productSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "OUT_OF_STOCK"]).default("ACTIVE"),
  productTypeId: z.string().nullable().optional(),
  customerTypeId: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  subCategoryId: z.string().nullable().optional(),
  brandId: z.string().nullable().optional(),
  unit: z.string().optional(),
  measurement: z.string().optional(),
  gstRate: z.number().min(0).max(100).optional(),
  hsnCode: z.string().optional(),
  image: z.string().optional(),
  images: z.array(z.string()).optional(),
  barcode: z.string().nullable().optional(),
  purchasePrice: z.number().nonnegative().optional(),
  mrp: z.number().nonnegative().optional(),
  preGst: z.number().nonnegative().optional(),
  dealerPrice: z.number().nonnegative().optional(),
  wholesalerPrice: z.number().nonnegative().optional(),
  parlourPrice: z.number().nonnegative().optional(),
  retailPrice: z.number().nonnegative().optional(),
  onlinePrice: z.number().nonnegative().optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  taxPercent: z.number().min(0).max(100).optional(),
  variantType: z.string().optional(),
  minOrderQty: z.number().int().positive().optional(),
  maxOrderQty: z.number().int().nonnegative().optional(),
  initialStock: z.number().int().nonnegative().optional(),
  customSku: z.string().nullable().optional(),
  variants: z.array(z.object({
    id: z.string().optional(),
    sku: z.string(),
    name: z.string(),
    mrp: z.number().nonnegative(),
    price: z.number().nonnegative(),
    weight: z.number().optional(),
    image: z.string().optional(),
    attributes: z.any().optional(),
  })).optional(),
  rolePrices: z.array(z.object({
    role: z.string(),
    price: z.number().nonnegative(),
    mrp: z.number().nonnegative(),
    discountPercent: z.number().min(0).max(100).optional(),
    minQty: z.number().int().positive().optional(),
    commissionPercent: z.number().min(0).max(100).optional(),
    visible: z.boolean().optional(),
  })).optional(),
});

// Generate barcode endpoint
router.post("/generate-barcode", async (req, res, next) => {
  try {
    let barcode;
    let isUnique = false;
    let attempts = 0;
    
    while (!isUnique && attempts < 10) {
      let code = "";
      for (let i = 0; i < 12; i++) {
        code += Math.floor(Math.random() * 10).toString();
      }
      
      let sum = 0;
      for (let i = 0; i < 12; i++) {
        const digit = parseInt(code[i], 10);
        sum += i % 2 === 0 ? digit : digit * 3;
      }
      const checkDigit = (10 - (sum % 10)) % 10;
      barcode = code + checkDigit;
      
      const existing = await prisma.product.findUnique({ where: { barcode } });
      isUnique = !existing;
      attempts++;
    }
    
    if (!isUnique) {
      throw new BadRequestError("Failed to generate unique barcode");
    }
    
    res.json({ success: true, data: { barcode } });
  } catch (error) { next(error); }
});

router.get("/", async (req, res, next) => {
  try {
    const { page, pageSize, skip } = paginate(req.query.page, req.query.pageSize);
    const q = req.query.q || "";
    const barcode = req.query.barcode || "";
    const categoryId = req.query.categoryId || "";
    const brandId = req.query.brandId || "";
    const status = req.query.status || "";

    const where = {
      AND: [
        q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { barcode: { contains: q, mode: "insensitive" } }] } : {},
        barcode ? { barcode: { equals: barcode } } : {},
        categoryId ? { categoryId } : {},
        brandId ? { brandId } : {},
        status ? { status } : {},
      ],
    };

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: true, brand: true, productType: true, variants: true, rolePrices: { include: { role: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.product.count({ where }),
    ]);

    res.json({ success: true, data: { items, total, page, pageSize } });
  } catch (error) { next(error); }
});

router.post("/", authenticate, requirePermission("product.create"), validate(productSchema), async (req, res, next) => {
  try {
    const body = req.body;

    const allRoles = await prisma.role.findMany();
    const roleMap = {};
    for (const r of allRoles) roleMap[r.name.toUpperCase()] = r.id;
    
    // Auto-create GENERAL if it doesn't exist in this database
    if (!roleMap["GENERAL"]) {
      const g = await prisma.role.create({ data: { name: "GENERAL", description: "General role", isSystem: true } });
      roleMap["GENERAL"] = g.id;
    }

    const product = await prisma.$transaction(async (tx) => {
      const p = await tx.product.create({
        data: {
          name: body.name,
          slug: body.slug || makeSlug(body.name),
          description: body.description,
          productTypeId: body.productTypeId || null,
          status: body.status,
          customerTypeId: body.customerTypeId || null,
          categoryId: body.categoryId || null,
          subCategoryId: body.subCategoryId || null,
          brandId: body.brandId || null,
          unit: body.unit,
          measurement: body.measurement,
          gstRate: body.gstRate || 0,
          hsnCode: body.hsnCode || null,
          image: body.image || (body.images?.length ? body.images[0] : null),
          images: body.images || [],
          barcode: body.barcode,
          purchasePrice: body.purchasePrice || 0,
          mrp: body.mrp || 0,
          preGst: body.preGst || 0,
          dealerPrice: body.dealerPrice || 0,
          wholesalerPrice: body.wholesalerPrice || 0,
          parlourPrice: body.parlourPrice || 0,
          retailPrice: body.retailPrice || 0,
          onlinePrice: body.onlinePrice || 0,
          discountPercent: body.discountPercent || 0,
          taxPercent: body.taxPercent || 0,
          variantType: body.variantType,
          minOrderQty: body.minOrderQty || 1,
          maxOrderQty: body.maxOrderQty || 0,
          initialStock: body.initialStock || 0,
          customSku: body.customSku,
        },
      });

      if (body.variants?.length) {
        await tx.productVariant.createMany({
          data: body.variants.map((v) => ({
            productId: p.id, sku: v.sku, name: v.name, mrp: v.mrp, price: v.price, weight: v.weight, image: v.image, attributes: v.attributes,
          })),
        });
      } else {
        await tx.productVariant.create({
          data: { productId: p.id, sku: `${makeSlug(body.name).toUpperCase()}-001`, name: body.name, mrp: body.mrp || 0, price: body.purchasePrice || 0 },
        });
      }

      if (body.rolePrices?.length) {
        const rpData = body.rolePrices
          .filter((rp) => roleMap[rp.role.toUpperCase()])
          .map((rp) => ({
            productId: p.id,
            roleId: roleMap[rp.role.toUpperCase()],
            price: rp.price,
            mrp: rp.mrp,
            discountPercent: rp.discountPercent || 0,
            minQty: rp.minQty || 1,
            commissionPercent: rp.commissionPercent || 0,
            visible: rp.visible !== false,
          }));
        if (rpData.length) await tx.rolePrice.createMany({ data: rpData });
      }

      return tx.product.findUnique({ where: { id: p.id }, include: { category: true, brand: true, productType: true, variants: true, rolePrices: { include: { role: true } } } });
    }, { maxWait: 20000, timeout: 30000 });

    await audit({ userId: req.user.id, action: "create", entityType: "product", entityId: product.id, newValue: { name: product.name } });
    res.status(201).json({ success: true, data: product });
  } catch (error) { next(error); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { category: true, brand: true, productType: true, variants: true, rolePrices: { include: { role: true } }, ProductImage: true, visibility: { include: { customerType: true } } },
    });
    if (!product) throw new NotFoundError("Product");
    res.json({ success: true, data: product });
  } catch (error) { next(error); }
});

router.put("/:id", authenticate, requirePermission("product.update"), validate(productSchema.partial()), async (req, res, next) => {
  try {
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError("Product");

    const { variants, rolePrices, ...data } = req.body;
    if (data.name && !data.slug) data.slug = makeSlug(data.name);

    const allRoles = await prisma.role.findMany();
    const roleMap = {};
    for (const r of allRoles) roleMap[r.name.toUpperCase()] = r.id;
    
    // Auto-create GENERAL if it doesn't exist in this database
    if (!roleMap["GENERAL"]) {
      const g = await prisma.role.create({ data: { name: "GENERAL", description: "General role", isSystem: true } });
      roleMap["GENERAL"] = g.id;
    }

    const product = await prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({ where: { id: req.params.id }, data });

      if (variants) {
        await tx.productVariant.deleteMany({ where: { productId: req.params.id } });
        if (variants.length) {
          await tx.productVariant.createMany({
            data: variants.map((v) => ({
              productId: req.params.id, sku: v.sku, name: v.name, mrp: v.mrp, price: v.price, weight: v.weight, image: v.image, attributes: v.attributes,
            })),
          });
        }
      }

      if (rolePrices) {
        console.log("RECEIVED ROLE PRICES:", JSON.stringify(rolePrices, null, 2));
        await tx.rolePrice.deleteMany({ where: { productId: req.params.id } });
        const rpData = rolePrices
          .filter((rp) => roleMap[rp.role.toUpperCase()])
          .map((rp) => ({
            productId: req.params.id,
            roleId: roleMap[rp.role.toUpperCase()],
            price: rp.price,
            mrp: rp.mrp,
            discountPercent: rp.discountPercent || 0,
            minQty: rp.minQty || 1,
            commissionPercent: rp.commissionPercent || 0,
            visible: rp.visible !== false,
          }));
        console.log("RPDATA TO INSERT:", rpData);
        if (rpData.length) await tx.rolePrice.createMany({ data: rpData });
      }

      return tx.product.findUnique({ where: { id: req.params.id }, include: { category: true, brand: true, productType: true, variants: true, rolePrices: { include: { role: true } } } });
    }, { maxWait: 20000, timeout: 30000 });

    await audit({ userId: req.user.id, action: "update", entityType: "product", entityId: product.id, newValue: data });
    res.json({ success: true, data: product });
  } catch (error) { next(error); }
});

router.delete("/:id", authenticate, requirePermission("product.delete"), async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product) throw new NotFoundError("Product");

    await prisma.product.update({ where: { id: req.params.id }, data: { status: "INACTIVE" } });
    await audit({ userId: req.user.id, action: "delete", entityType: "product", entityId: req.params.id });

    res.json({ success: true, data: { message: "Product deactivated" } });
  } catch (error) { next(error); }
});

module.exports = router;