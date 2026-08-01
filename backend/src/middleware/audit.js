const { prisma } = require("../config/database");

async function audit(params) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId || null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId || null,
        oldValue: params.oldValue || null,
        newValue: params.newValue || null,
        ipAddress: params.ipAddress || null,
      },
    });
  } catch (error) {
    console.error("Audit log failed:", error.message);
  }
}

function auditMiddleware(action, entityType) {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = async function (body) {
      if (res.statusCode < 400 && req.user) {
        await audit({
          userId: req.user.id,
          action,
          entityType,
          entityId: req.params.id || body?.data?.id || null,
          newValue: body?.data || null,
          ipAddress: req.ip,
        });
      }
      return originalJson(body);
    };
    next();
  };
}

module.exports = { audit, auditMiddleware };
