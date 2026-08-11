const fs = require("fs");
const path = require("path");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// 1. Ensure required output folders exist
ensureDir(".next");
ensureDir("nodejs");
ensureDir(".next/nodejs");

// 2. Copy entry point files across root, nodejs, and .next build target directories
const filesToCopy = ["server.js", "index.js", "app.js"];
filesToCopy.forEach((file) => {
  if (fs.existsSync(file)) {
    fs.copyFileSync(file, path.join("nodejs", file));
    fs.copyFileSync(file, path.join(".next", file));
    fs.copyFileSync(file, path.join(".next", "nodejs", file));
  }
});

console.log("[POSTBUILD] Synced server entry points into .next, .next/nodejs, and nodejs build directories.");
