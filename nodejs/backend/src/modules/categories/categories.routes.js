const express = require("express");
const router = express.Router();
const { z } = require("zod");
const { prisma } = require("../../config/database");
const { makeSlug } = require("../../utils/helpers");
const { authenticate } = require("../../middleware/auth");
const { requirePermission } = require("../../middleware/rbac");
const { validate } = require("../../middleware/validate");
const { NotFoundError, BadRequestError } = require("../../utils/errors");
const { audit } = require("../../middleware/audit");

async function uniqueSlug(base, excludeId = null) {
  let slug = base;
  let n = 1;
  while (true) {
    const existing = await prisma.category.findUnique({ where: { slug } });
    if (!existing || existing.id === excludeId) return slug;
    n++;
    slug = `${base}-${n}`;
  }
}

const categorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  description: z.string().optional(),
  image: z.string().optional(),
  parentId: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
  status: z.boolean().optional(),
});

async function buildTree(parentId = null) {
  const cats = await prisma.category.findMany({
    where: { parentId },
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { products: true, children: true } } },
  });
  return Promise.all(
    cats.map(async (cat) => ({
      ...cat,
      children: await buildTree(cat.id),
    }))
  );
}

router.get("/", async (req, res, next) => {
  try {
    const tree = await buildTree(null);
    res.json({ success: true, data: tree });
  } catch (error) { next(error); }
});

router.get("/flat", async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({ orderBy: { name: "asc" }, include: { parent: { select: { id: true, name: true } } } });
    res.json({ success: true, data: categories });
  } catch (error) { next(error); }
});

router.post("/", authenticate, requirePermission("category.create"), validate(categorySchema), async (req, res, next) => {
  try {
    const { name, slug, description, image, parentId, sortOrder, status } = req.body;
    const finalSlug = await uniqueSlug(slug || makeSlug(name));
    const category = await prisma.category.create({
      data: {
        name,
        slug: finalSlug,
        description: description || null,
        image: image || null,
        parentId: parentId || null,
        sortOrder: sortOrder || 0,
        status: status !== undefined ? status : true,
      },
    });
    await audit({ userId: req.user.id, action: "create", entityType: "category", entityId: category.id, newValue: { name } });
    res.status(201).json({ success: true, data: category });
  } catch (error) { next(error); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const category = await prisma.category.findUnique({
      where: { id: req.params.id },
      include: { parent: true, children: true, _count: { select: { products: true } } },
    });
    if (!category) throw new NotFoundError("Category");
    res.json({ success: true, data: category });
  } catch (error) { next(error); }
});

router.put("/:id", authenticate, requirePermission("category.update"), validate(categorySchema), async (req, res, next) => {
  try {
    const existing = await prisma.category.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError("Category");
    if (req.body.parentId === req.params.id) throw new BadRequestError("Category cannot be its own parent");

    const data = { ...req.body };
    if (data.name && !data.slug) data.slug = makeSlug(data.name);

    const category = await prisma.category.update({ where: { id: req.params.id }, data });
    await audit({ userId: req.user.id, action: "update", entityType: "category", entityId: category.id, newValue: data });
    res.json({ success: true, data: category });
  } catch (error) { next(error); }
});

router.delete("/:id", authenticate, requirePermission("category.delete"), async (req, res, next) => {
  try {
    const category = await prisma.category.findUnique({ where: { id: req.params.id }, include: { _count: { select: { products: true, children: true } } } });
    if (!category) throw new NotFoundError("Category");

    await prisma.$transaction(async (tx) => {
      if (category._count.products > 0) {
        await tx.product.updateMany({ where: { categoryId: req.params.id }, data: { categoryId: category.parentId } });
      }
      if (category._count.children > 0) {
        await tx.category.updateMany({ where: { parentId: req.params.id }, data: { parentId: category.parentId } });
      }
      await tx.category.delete({ where: { id: req.params.id } });
    });

    await audit({ userId: req.user.id, action: "delete", entityType: "category", entityId: req.params.id });
    res.json({ success: true, data: { message: "Category deleted" } });
  } catch (error) { next(error); }
});

module.exports = router;
