const express = require("express");
const path = require("path");
const next = require("next");

const PORT = process.env.PORT || 3000;
const dev = process.env.NODE_ENV !== "production";

async function main() {
  if (dev) {
    console.warn("[WARNING] Running server.js in DEV mode is not recommended. Use 'npm run dev' for multi-process development.");
  }

  // Require Express app instance (NOT backend/src/server.js)
  const backendApp = require("./backend/src/app");

  const adminApp = next({ dev, dir: path.join(__dirname, "admin"), hostname: "0.0.0.0", port: PORT });
  const storeApp = next({ dev, dir: path.join(__dirname, "storefront"), hostname: "0.0.0.0", port: PORT });

  await adminApp.prepare();
  await storeApp.prepare();

  const handleAdmin = adminApp.getRequestHandler();
  const handleStore = storeApp.getRequestHandler();

  const server = express();
  server.disable("x-powered-by");

  // 1) API + Uploads -> Express Backend (Isolates global Express middlewares)
  server.use((req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) {
      return backendApp(req, res);
    }
    next();
  });

  // 2) Admin Static Assets -> Strip /admin-assets prefix before handing to Next.js
  server.use("/admin-assets", (req, res) => {
    req.url = req.url.replace(/^\/admin-assets/, "");
    return handleAdmin(req, res);
  });

  // 3) Admin Pages (/admin, /admin/*)
  server.use("/admin", (req, res) => handleAdmin(req, res));

  // 4) Storefront Catch-All (/, /store/*, /account/*, /login, /_next/*)
  server.use((req, res) => handleStore(req, res));

  server.listen(PORT, () => console.log(`> Unified ERP Gateway running on http://localhost:${PORT}`));
}

main().catch(err => {
  console.error("Failed to start gateway server:", err);
  process.exit(1);
});
