const express = require("express");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const config = require("./config");
const { apiLimiter } = require("./middleware/rateLimiter");
const { errorHandler } = require("./middleware/errorHandler");
const securityMiddleware = require("./middleware/security");

const app = express();

app.set("trust proxy", config.nodeEnv === "production" ? true : "loopback");
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(securityMiddleware);
const allowedOrigins = config.cors.origin.split(",").map((o) => o.trim());
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
}));
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use(morgan(config.nodeEnv === "production" ? "combined" : "dev"));

app.use("/api", apiLimiter);

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use("/api/v1/health", require("./modules/health/health.routes"));

app.use("/api/v1/auth", require("./modules/auth/auth.routes"));
app.use("/api/v1/users", require("./modules/users/users.routes"));
app.use("/api/v1/roles", require("./modules/roles/roles.routes"));
app.use("/api/v1/permissions", require("./modules/permissions/permissions.routes"));
app.use("/api/v1/products", require("./modules/products/products.routes"));
app.use("/api/v1/categories", require("./modules/categories/categories.routes"));
app.use("/api/v1/brands", require("./modules/brands/brands.routes"));
app.use("/api/v1/orders", require("./modules/orders/orders.routes"));
app.use("/api/v1/inventory", require("./modules/inventory/inventory.routes"));
app.use("/api/v1/warehouses", require("./modules/warehouses/warehouses.routes"));
app.use("/api/v1/returns", require("./modules/returns/returns.routes"));
app.use("/api/v1/payments", require("./modules/payments/payments.routes"));
app.use("/api/v1/dispatches", require("./modules/dispatches/dispatches.routes"));
app.use("/api/v1/suppliers", require("./modules/suppliers/suppliers.routes"));
app.use("/api/v1/purchase-orders", require("./modules/purchase-orders/purchase-orders.routes"));
app.use("/api/v1/commissions", require("./modules/commissions/commissions.routes"));
app.use("/api/v1/vendors", require("./modules/vendors/vendors.routes"));
app.use("/api/v1/pos", require("./modules/pos/pos.routes"));
app.use("/api/v1/tickets", require("./modules/tickets/tickets.routes"));
app.use("/api/v1/sliders", require("./modules/sliders/sliders.routes"));
app.use("/api/v1/tickers", require("./modules/tickers/tickers.routes"));
app.use("/api/v1/notifications", require("./modules/notifications/notifications.routes"));
app.use("/api/v1/settings", require("./modules/settings/settings.routes"));
app.use("/api/v1/audit-logs", require("./modules/audit-logs/audit-logs.routes"));
app.use("/api/v1/activities", require("./modules/activity-tracking/activity-tracking.routes"));
app.use("/api/v1/reports", require("./modules/reports/reports.routes"));
app.use("/api/v1/dashboard", require("./modules/dashboard/dashboard.routes"));
app.use("/api/v1/customer-types", require("./modules/customer-types/customer-types.routes"));
app.use("/api/v1/product-types", require("./modules/product-types/product-types.routes"));
app.use("/api/v1/salespersons", require("./modules/salespersons/salespersons.routes"));
app.use("/api/v1/stock-alerts", require("./modules/stock-alerts/stock-alerts.routes"));
app.use("/api/v1/role-upgrade-requests", require("./modules/role-upgrade-requests/role-upgrade-requests.routes"));
app.use("/api/v1/upload", require("./modules/upload/upload.routes"));
app.use("/api/v1/login-as", require("./modules/login-as/login-as.routes"));
app.use("/api/v1/product-images", require("./modules/product-images/product-images.routes"));
app.use("/api/v1/tax", require("./modules/tax/tax.routes"));
app.use("/api/v1/gst", require("./modules/gst/gst.routes"));
app.use("/api/v1/email-templates", require("./modules/email-templates/email-templates.routes"));
app.use("/api/v1/sms-templates", require("./modules/sms-templates/sms-templates.routes"));
app.use("/api/v1/whatsapp-templates", require("./modules/whatsapp-templates/whatsapp-templates.routes"));
app.use("/api/v1/stores", require("./modules/multi-store/multi-store.routes"));
app.use("/api/v1/skus", require("./modules/sku-management/sku-management.routes"));
app.use("/api/v1/inventory/receive", require("./modules/inventory-receive/inventory-receive.routes"));
app.use("/api/v1/inventory/dispatch", require("./modules/inventory-dispatch/inventory-dispatch.routes"));
app.use("/api/v1/inventory/returns", require("./modules/inventory-returns/inventory-returns.routes"));
app.use("/api/v1/product-variants", require("./modules/product-variants/product-variants.routes"));
app.use("/api/v1/store", require("./modules/storefront/storefront.routes"));
app.use("/api/v1/account", require("./modules/account/account.routes"));

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use("/api", (req, res) => {
  res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "API route not found" } });
});

app.use("/uploads", (req, res) => {
  res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "File not found" } });
});

app.use(errorHandler);

module.exports = app;
