const path = require("path");
require("dotenv").config();
require("dotenv").config({ path: path.join(__dirname, "../backend/.env") });
const express = require("express");
const next = require("next");

const PORT = process.env.PORT || 3000;
const dev = process.env.NODE_ENV !== "production";

async function main() {
  if (dev) {
    console.warn("[WARNING] Running server in DEV mode is not recommended.");
  }

  const backendApp = require("../backend/src/app");

  const adminApp = next({ dev, dir: path.join(__dirname, "../admin"), hostname: "0.0.0.0", port: PORT });
  const storeApp = next({ dev, dir: path.join(__dirname, "../storefront"), hostname: "0.0.0.0", port: PORT });

  await adminApp.prepare();
  await storeApp.prepare();

  const handleAdmin = adminApp.getRequestHandler();
  const handleStore = storeApp.getRequestHandler();

  const server = express();
  server.disable("x-powered-by");

  server.use((req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) {
      return backendApp(req, res);
    }
    next();
  });

  server.use("/admin-assets", (req, res) => {
    req.url = req.url.replace(/^\/admin-assets/, "");
    return handleAdmin(req, res);
  });

  server.use("/admin", (req, res) => handleAdmin(req, res));
  server.use((req, res) => handleStore(req, res));

  server.listen(PORT, () => console.log(`> Unified ERP Gateway running on http://localhost:${PORT}`));
}

main().catch(err => {
  console.error("Failed to start gateway server:", err);
  process.exit(1);
});
