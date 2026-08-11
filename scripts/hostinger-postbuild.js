const fs = require("fs");
const path = require("path");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();

  if (isDirectory) {
    ensureDir(dest);
    fs.readdirSync(src).forEach((childItemName) => {
      // Exclude recursive .next or cache folders to prevent infinite nesting
      if (childItemName === ".next" || childItemName === "cache" || childItemName === ".git") return;
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else if (exists) {
    fs.copyFileSync(src, dest);
  }
}

// 1. Ensure required output folders exist
ensureDir(".next");
ensureDir("nodejs");
ensureDir(".next/nodejs");

// 2. Copy entry point files across root, nodejs, and .next build target directories
const filesToCopy = ["server.js", "index.js", "app.js", "package.json"];
filesToCopy.forEach((file) => {
  if (fs.existsSync(file)) {
    fs.copyFileSync(file, path.join("nodejs", file));
    fs.copyFileSync(file, path.join(".next", file));
    fs.copyFileSync(file, path.join(".next", "nodejs", file));
  }
});

// 3. Copy application folders into .next so if Hostinger deploys strictly .next as output directory, all apps exist!
const dirsToCopy = ["backend", "admin", "storefront", "node_modules"];
dirsToCopy.forEach((dir) => {
  if (fs.existsSync(dir)) {
    try {
      copyRecursiveSync(dir, path.join(".next", dir));
    } catch (e) {
      console.warn(`[POSTBUILD] Warning copying ${dir} to .next:`, e.message);
    }
  }
});

console.log("[POSTBUILD] Synced entire monorepo bundle into .next output directory for Hostinger deployment.");
