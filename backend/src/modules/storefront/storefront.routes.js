const express = require("express");
const router = express.Router();
const { prisma } = require("../../config/database");
const { paginate } = require("../../utils/helpers");
const { NotFoundError } = require("../../utils/errors");

function flattenProduct(p) {
  const firstVariant = p.variants?.[0] || {};
  const stockQuantity = (p.inventory || []).reduce((sum, inv) => sum + (inv.quantity || 0), 0);
  const images = (p.ProductImage || []).map((img) => ({
    url: img.url,
    alt: img.alt,
    isPrimary: img.isPrimary,
    sortOrder: img.sortOrder,
  }));
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    type: p.productType?.name || null,
    status: p.status,
    image: p.image,
    unit: p.unit,
    measurement: p.measurement,
    gstRate: p.gstRate,
    price: firstVariant.price || 0,
    compareAtPrice: firstVariant.mrp || 0,
    sku: firstVariant.sku || null,
    stockQuantity,
    averageRating: null,
    reviewCount: 0,
    category: p.category || null,
    brand: p.brand || null,
    variants: (p.variants || []).map((v) => ({
      id: v.id,
      sku: v.sku,
      name: v.name,
      mrp: v.mrp,
      price: v.price,
      weight: v.weight,
      image: v.image,
      attributes: v.attributes,
      status: v.status,
    })),
    images,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

router.get("/products", async (req, res, next) => {
  try {
    const { page, pageSize, skip } = paginate(req.query.page, req.query.limit || req.query.page, parseInt(req.query.limit) || 24);
    const q = req.query.q || "";
    const categoryId = req.query.category || "";
    const brandId = req.query.brand || "";
    const sort = req.query.sort || "";
    const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice) : null;
    const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice) : null;

    const where = {
      status: "ACTIVE",
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
      ...(categoryId ? { OR: [{ categoryId }, { category: { slug: categoryId } }] } : {}),
      ...(brandId ? { OR: [{ brandId }, { brand: { slug: brandId } }] } : {}),
    };

    let orderBy = { createdAt: "desc" };
    if (sort === "price_asc") orderBy = { variants: { _count: "asc" } };
    if (sort === "price_desc") orderBy = { variants: { _count: "desc" } };
    if (sort === "newest") orderBy = { createdAt: "desc" };
    if (sort === "oldest") orderBy = { createdAt: "asc" };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          brand: { select: { id: true, name: true, slug: true } },
          productType: { select: { id: true, name: true, slug: true } },
          variants: true,
          ProductImage: { orderBy: { sortOrder: "asc" } },
          inventory: { select: { quantity: true } },
        },
        orderBy,
        skip,
        take: pageSize,
      }),
      prisma.product.count({ where }),
    ]);

    let flattened = products.map(flattenProduct);

    if (minPrice !== null) flattened = flattened.filter((p) => p.price >= minPrice);
    if (maxPrice !== null) flattened = flattened.filter((p) => p.price <= maxPrice);

    if (sort === "price_asc") flattened.sort((a, b) => a.price - b.price);
    if (sort === "price_desc") flattened.sort((a, b) => b.price - a.price);

    res.json({ success: true, data: flattened });
  } catch (error) { next(error); }
});

router.get("/products/:id", async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true, slug: true } },
        productType: { select: { id: true, name: true, slug: true } },
        variants: true,
        ProductImage: { orderBy: { sortOrder: "asc" } },
        inventory: { select: { quantity: true } },
      },
    });
    if (!product) throw new NotFoundError("Product");
    res.json({ success: true, data: flattenProduct(product) });
  } catch (error) { next(error); }
});

router.get("/categories", async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      where: { status: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true, image: true },
    });
    res.json({ success: true, data: categories });
  } catch (error) { next(error); }
});

router.get("/brands", async (req, res, next) => {
  try {
    const brands = await prisma.brand.findMany({
      where: { status: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true, logo: true },
    });
    res.json({ success: true, data: brands });
  } catch (error) { next(error); }
});

router.get("/sliders", async (req, res, next) => {
  try {
    const sliders = await prisma.slider.findMany({
      where: { status: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, title: true, subtitle: true, image: true, buttonText: true, url: true },
    });
    res.json({ success: true, data: sliders });
  } catch (error) { next(error); }
});

router.get("/tickers", async (req, res, next) => {
  try {
    const tickers = await prisma.tickerMessage.findMany({
      where: { status: true },
      orderBy: { createdAt: "desc" },
      select: { id: true, message: true, type: true, link: true },
    });
    res.json({ success: true, data: tickers });
  } catch (error) { next(error); }
});

module.exports = router;
