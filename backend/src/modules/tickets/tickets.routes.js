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

const ticketCreateSchema = z.object({
  subject: z.string().min(1),
  description: z.string().min(1),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  assignedToId: z.string().optional(),
});

const ticketUpdateSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assignedToId: z.string().nullable().optional(),
});

const ticketReplySchema = z.object({
  message: z.string().min(1),
  isInternal: z.boolean().optional(),
});

router.get("/", authenticate, requirePermission("ticket.read"), async (req, res, next) => {
  try {
    const { page, pageSize, skip } = paginate(req.query.page, req.query.pageSize);
    const status = req.query.status || "";
    const priority = req.query.priority || "";

    const where = {
      AND: [
        status ? { status } : {},
        priority ? { priority } : {},
      ],
    };

    const [items, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: { createdBy: { select: { name: true, email: true } }, assignedTo: { select: { name: true, email: true } }, _count: { select: { replies: true, messages: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.ticket.count({ where }),
    ]);

    res.json({ success: true, data: { items, total, page, pageSize } });
  } catch (error) { next(error); }
});

router.post("/", authenticate, requirePermission("ticket.create"), validate(ticketCreateSchema), async (req, res, next) => {
  try {
    const ticket = await prisma.ticket.create({
      data: {
        subject: req.body.subject,
        description: req.body.description,
        priority: req.body.priority,
        createdById: req.user.id,
        assignedToId: req.body.assignedToId || null,
        entityType: req.body.entityType || null,
        entityId: req.body.entityId || null,
      },
      include: { createdBy: { select: { name: true, email: true } } },
    });

    await audit({ userId: req.user.id, action: "create", entityType: "ticket", entityId: ticket.id, newValue: { subject: ticket.subject } });
    res.status(201).json({ success: true, data: ticket });
  } catch (error) { next(error); }
});

router.get("/:id", authenticate, requirePermission("ticket.read"), async (req, res, next) => {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.id },
      include: {
        createdBy: { select: { name: true, email: true } },
        assignedTo: { select: { name: true, email: true } },
        replies: { include: { user: { select: { name: true, email: true } } }, orderBy: { createdAt: "asc" } },
        messages: { include: { user: { select: { name: true, email: true } } }, orderBy: { createdAt: "asc" } },
      },
    });
    if (!ticket) throw new NotFoundError("Ticket");
    res.json({ success: true, data: ticket });
  } catch (error) { next(error); }
});

router.patch("/:id", authenticate, requirePermission("ticket.update"), validate(ticketUpdateSchema), async (req, res, next) => {
  try {
    const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
    if (!ticket) throw new NotFoundError("Ticket");

    const updated = await prisma.ticket.update({
      where: { id: req.params.id },
      data: req.body,
    });

    await audit({ userId: req.user.id, action: "update", entityType: "ticket", entityId: req.params.id, newValue: req.body });
    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
});

router.post("/:id/replies", authenticate, requirePermission("ticket.reply"), validate(ticketReplySchema), async (req, res, next) => {
  try {
    const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
    if (!ticket) throw new NotFoundError("Ticket");

    const reply = await prisma.ticketMessage.create({
      data: {
        ticketId: req.params.id,
        userId: req.user.id,
        message: req.body.message,
        isInternal: req.body.isInternal || false,
      },
      include: { user: { select: { name: true, email: true } } },
    });

    await audit({ userId: req.user.id, action: "reply", entityType: "ticket", entityId: req.params.id, newValue: { message: req.body.message.substring(0, 100) } });
    res.status(201).json({ success: true, data: reply });
  } catch (error) { next(error); }
});

module.exports = router;
