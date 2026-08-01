const express = require("express");
const router = express.Router();
const { prisma } = require("../../config/database");
const { authenticate } = require("../../middleware/auth");
const { requirePermission } = require("../../middleware/rbac");

router.get("/", authenticate, requirePermission("permission.read"), async (req, res, next) => {
  try {
    const permissions = await prisma.permission.findMany({
      orderBy: [{ module: "asc" }, { action: "asc" }],
    });
    res.json({ success: true, data: permissions });
  } catch (error) { next(error); }
});

router.get("/grouped", authenticate, requirePermission("permission.read"), async (req, res, next) => {
  try {
    const permissions = await prisma.permission.findMany({
      orderBy: [{ module: "asc" }, { action: "asc" }],
    });

    const grouped = permissions.reduce((acc, p) => {
      if (!acc[p.module]) acc[p.module] = [];
      acc[p.module].push(p);
      return acc;
    }, {});

    res.json({ success: true, data: grouped });
  } catch (error) { next(error); }
});

module.exports = router;
