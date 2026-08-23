const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, ".env") });
require("dotenv").config({ path: path.join(__dirname, "../.env") });
require("dotenv").config({ path: path.join(__dirname, "backend/.env") });
const express = require("express");
const next = require("next");

// Resolve monorepo root directory dynamically
const rootDir = fs.existsSync(path.join(__dirname, "backend"))
  ? __dirname
  : fs.existsSync(path.join(__dirname, "../backend"))
  ? path.resolve(__dirname, "..")
  : __dirname;

const PORT = process.env.PORT || 3000;
const dev = process.argv.includes("--dev") || (process.env.NODE_ENV === "development" && !fs.existsSync(path.join(rootDir, "storefront/.next")));

async function main() {
  if (dev) {
    console.warn("[WARNING] Running server.js in DEV mode is not recommended. Use 'npm run dev' for multi-process development.");
  }

  // Require Express app instance from rootDir
  const backendApp = require(path.join(rootDir, "backend/src/app"));

  const adminApp = next({ dev, dir: path.join(rootDir, "admin"), hostname: "0.0.0.0", port: PORT });
  const storeApp = next({ dev, dir: path.join(rootDir, "storefront"), hostname: "0.0.0.0", port: PORT });

  await adminApp.prepare();
  await storeApp.prepare();

  const handleAdmin = adminApp.getRequestHandler();
  const handleStore = storeApp.getRequestHandler();

  const server = express();
  server.disable("x-powered-by");

  // 1) API + Uploads -> Express Backend
  server.use((req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) {
      return backendApp(req, res);
    }
    next();
  });

  // 2) Admin Static Assets
  server.use("/admin-assets", (req, res) => {
    req.url = req.url.replace(/^\/admin-assets/, "");
    return handleAdmin(req, res);
  });

  // 3) Admin Pages (/admin, /admin/*)
  server.use((req, res, next) => {
    if (req.path === "/admin" || req.path.startsWith("/admin/")) {
      return handleAdmin(req, res);
    }
    next();
  });

  // 4) Storefront Catch-All (/, /store/*, /account/*, /login, /_next/*)
  server.use((req, res) => handleStore(req, res));

  server.listen(PORT, () => console.log(`> Unified ERP Gateway running on http://localhost:${PORT}`));
}

main().catch(err => {
  console.error("Failed to start gateway server:", err);
  process.exit(1);
});
