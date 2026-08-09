const { ForbiddenError } = require("../utils/errors");

function hasPermission(user, code) {
  if (!user) return false;
  if (user.permissions.includes("*")) return true;
  return user.permissions.includes(code);
}

function requirePermission(code) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
    }
    if (!hasPermission(req.user, code)) {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: `Missing permission: ${code}`,
        },
      });
    }
    next();
  };
}

function requireAnyRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
    }
    const hasRole = req.user.roles.some((r) => roles.includes(r));
    if (!hasRole) {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: `Requires role: ${roles.join(", ")}`,
        },
      });
    }
    next();
  };
}

const ALL_PERMISSIONS = [
  "dashboard.read", "dashboard.export",
  "product.create", "product.read", "product.update", "product.delete", "product.list", "product.export", "product.import",
  "category.create", "category.read", "category.update", "category.delete", "category.tree",
  "brand.create", "brand.read", "brand.update", "brand.delete",
  "product.image.upload", "product.image.delete",
  "product.variant.create", "product.variant.read", "product.variant.update", "product.variant.delete",
  "product.sku.read", "product.sku.generate",
  "product.price.read", "product.price.update",
  "product.visibility.read", "product.visibility.update",
  "barcode.create", "barcode.read", "barcode.update", "barcode.scan",
  "inventory.create", "inventory.read", "inventory.update", "inventory.delete", "inventory.adjust",
  "inventory.receive.create", "inventory.receive.read", "inventory.receive.update",
  "inventory.dispatch.create", "inventory.dispatch.read", "inventory.dispatch.update", "inventory.dispatch.scan",
  "inventory.return.create", "inventory.return.read", "inventory.return.update",
  "warehouse.create", "warehouse.read", "warehouse.update", "warehouse.delete",
  "warehouse.transfer.create", "warehouse.transfer.read", "warehouse.transfer.update", "warehouse.transfer.complete",
  "store.create", "store.read", "store.update", "store.delete",
  "order.create", "order.read", "order.update", "order.delete", "order.export", "order.review", "order.approve",
  "cart.create", "cart.read", "cart.update", "cart.delete",
  "wishlist.create", "wishlist.read", "wishlist.delete",
  "payment.create", "payment.read", "payment.update", "payment.refund",
  "dispatch.create", "dispatch.read", "dispatch.update", "dispatch.scan",
  "return.create", "return.read", "return.update", "return.process",
  "supplier.create", "supplier.read", "supplier.update", "supplier.delete",
  "supplier.txn.create", "supplier.txn.read",
  "purchase.order.create", "purchase.order.read", "purchase.order.update", "purchase.order.approve", "purchase.order.receive",
  "commission.read", "commission.approve", "commission.pay", "commission.configure",
  "vendor.create", "vendor.read", "vendor.update", "vendor.approve", "vendor.reject",
  "pos.create", "pos.read", "pos.update", "pos.session.open", "pos.session.close",
  "user.create", "user.read", "user.update", "user.delete", "user.list", "user.export", "user.status",
  "role.create", "role.read", "role.update", "role.delete",
  "permission.read",
  "role.upgrade.read", "role.upgrade.approve", "role.upgrade.reject",
  "ticket.create", "ticket.read", "ticket.update", "ticket.delete", "ticket.assign", "ticket.reply",
  "slider.create", "slider.read", "slider.update", "slider.delete",
  "ticker.create", "ticker.read", "ticker.update", "ticker.delete",
  "notification.read", "notification.send", "notification.mark.read",
  "email.template.create", "email.template.read", "email.template.update", "email.template.delete", "email.template.preview",
  "sms.template.create", "sms.template.read", "sms.template.update", "sms.template.delete",
  "whatsapp.template.create", "whatsapp.template.read", "whatsapp.template.update", "whatsapp.template.delete",
  "tax.create", "tax.read", "tax.update", "tax.delete", "tax.calculate",
  "gst.create", "gst.read", "gst.update", "gst.file", "gst.report",
  "setting.read", "setting.update",
  "audit.log.read", "audit.log.export",
  "activity.read", "activity.stats",
  "report.read", "report.export",
  "login.as.create", "login.as.read",
  "customer.type.create", "customer.type.read", "customer.type.update",
  "product.type.create", "product.type.read", "product.type.update",
  "salesperson.create", "salesperson.read", "salesperson.update",
  "stock.alert.read", "stock.alert.update",
  "upload.create", "upload.delete",
];

module.exports = { hasPermission, requirePermission, requireAnyRole, ALL_PERMISSIONS };
