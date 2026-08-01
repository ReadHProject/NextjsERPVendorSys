const { prisma } = require("../config/database");

const NotificationType = {
  ORDER_UPDATE: "ORDER_UPDATE",
  STOCK_ALERT: "STOCK_ALERT",
  COMMISSION: "COMMISSION",
  SYSTEM: "SYSTEM",
  VENDOR: "VENDOR",
  CUSTOM: "CUSTOM",
};

class NotificationService {
  async create(userId, { title, body, type, entityType, entityId, data }) {
    return prisma.notification.create({
      data: {
        userId,
        title,
        body,
        type: type || NotificationType.SYSTEM,
        entityType: entityType || null,
        entityId: entityId || null,
        data: data || null,
      },
    });
  }

  async createBulk(userIds, { title, body, type, entityType, entityId, data }) {
    const notifications = userIds.map((userId) => ({
      userId,
      title,
      body,
      type: type || NotificationType.SYSTEM,
      entityType: entityType || null,
      entityId: entityId || null,
      data: data || null,
    }));
    return prisma.notification.createMany({ data: notifications });
  }

  async getForUser(userId, { page = 1, pageSize = 20, unreadOnly = false } = {}) {
    const where = { userId };
    if (unreadOnly) where.read = false;

    const [items, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, read: false } }),
    ]);

    return { items, total, unreadCount, page, pageSize };
  }

  async markRead(id, userId) {
    return prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });
  }

  async markAllRead(userId) {
    return prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }

  async getUnreadCount(userId) {
    return prisma.notification.count({
      where: { userId, read: false },
    });
  }
}

module.exports = new NotificationService();
