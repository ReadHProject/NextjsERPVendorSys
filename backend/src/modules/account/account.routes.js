const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const { auditMiddleware: audit } = require("../../middleware/audit");
const { z } = require("zod");
const { prisma } = require("../../config/database");
const { BadRequestError, NotFoundError } = require("../../utils/errors");

// Address validation schema
const addressSchema = z.object({
  fullName: z.string().min(1, "Full Name is required"),
  phone: z.string().min(1, "Phone is required"),
  addressLine1: z.string().min(1, "Address Line 1 is required"),
  addressLine2: z.string().optional().nullable(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  pincode: z.string().min(1, "Pincode is required"),
  isDefault: z.boolean().default(false)
});

// GET /api/v1/account/addresses - Fetch user addresses
router.get("/addresses", authenticate, async (req, res, next) => {
  try {
    const addresses = await prisma.address.findMany({
      where: { userId: req.user.id },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' }
      ]
    });
    res.json({ success: true, data: addresses });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/account/addresses - Add new address
router.post("/addresses", authenticate, validate(addressSchema), audit("address.create"), async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { isDefault, ...rest } = req.body;

    // If making default, unset other defaults
    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false }
      });
    }

    const address = await prisma.address.create({
      data: {
        userId,
        isDefault,
        ...rest
      }
    });

    res.json({ success: true, data: address });
  } catch (error) {
    next(error);
  }
});

// PUT /api/v1/account/addresses/:id - Update an address
router.put("/addresses/:id", authenticate, validate(addressSchema), audit("address.update"), async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { isDefault, ...rest } = req.body;

    const existing = await prisma.address.findFirst({
      where: { id, userId }
    });

    if (!existing) {
      throw new NotFoundError("Address not found");
    }

    // If making default, unset other defaults
    if (isDefault && !existing.isDefault) {
      await prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false }
      });
    }

    const address = await prisma.address.update({
      where: { id },
      data: { isDefault, ...rest }
    });

    res.json({ success: true, data: address });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/account/addresses/:id - Delete an address
router.delete("/addresses/:id", authenticate, audit("address.delete"), async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const existing = await prisma.address.findFirst({
      where: { id, userId }
    });

    if (!existing) {
      throw new NotFoundError("Address not found");
    }

    await prisma.address.delete({ where: { id } });

    res.json({ success: true, data: { deleted: true } });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
