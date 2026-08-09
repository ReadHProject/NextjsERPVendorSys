const { prisma } = require("../config/database");

const ActivityType = {
  LOGIN: "LOGIN",
  CREATE: "CREATE",
  UPDATE: "UPDATE",
  DELETE: "DELETE",
  APPROVE: "APPROVE",
  REJECT: "REJECT",
  STATUS_CHANGE: "STATUS_CHANGE",
  EXPORT: "EXPORT",
  IMPORT: "IMPORT",
};

class ActivityService {
  async log({ userId, type, entityType, entityId, description, metadata, ipAddress, userAgent }) {
    try {
      return prisma.activityLog.create({
        data: {
          userId: userId || null,
          type,
          entityType,
          entityId: entityId || null,
          description,
          metadata: metadata || null,
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
        },
      });
    } catch (error) {
      console.error("Activity log failed:", error.message);
    }
  }

  async getActivities({ page = 1, pageSize = 20, userId, entityType, type } = {}) {
    const where = {};
    if (userId) where.userId = userId;
    if (entityType) where.entityType = entityType;
    if (type) where.type = type;

    const [items, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.activityLog.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async getStats() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const [todayCount, weekCount, byType, recentUsers] = await Promise.all([
      prisma.activityLog.count({ where: { createdAt: { gte: today } } }),
      prisma.activityLog.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.activityLog.groupBy({
        by: ["type"],
        _count: true,
        orderBy: { _count: { type: "desc" } },
      }),
      prisma.activityLog.findMany({
        distinct: ["userId"],
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { userId: true },
      }),
    ]);

    return { todayCount, weekCount, byType, recentUserIds: recentUsers.map((r) => r.userId) };
  }
}

module.exports = new ActivityService();
