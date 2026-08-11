const path = require("path");
const fs = require("fs");
require("dotenv").config();
require("dotenv").config({ path: path.join(__dirname, "../backend/.env") });
const express = require("express");
const next = require("next");

const PORT = process.env.PORT || 3000;
const dev = process.env.NODE_ENV !== "production";

function findRoot(startDir) {
  let curr = startDir;
  for (let i = 0; i < 4; i++) {
    if (fs.existsSync(path.join(curr, "backend"))) {
      return curr;
    }
    const parent = path.dirname(curr);
    if (parent === curr) break;
    curr = parent;
  }
  return startDir;
}

async function main() {
  if (dev) {
    console.warn("[WARNING] Running server in DEV mode is not recommended.");
  }

  const rootDir = findRoot(__dirname);

  const backendApp = require(path.join(rootDir, "backend/src/app"));
  const adminApp = next({ dev, dir: path.join(rootDir, "admin"), hostname: "0.0.0.0", port: PORT });
  const storeApp = next({ dev, dir: path.join(rootDir, "storefront"), hostname: "0.0.0.0", port: PORT });

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
