/**
 * Copy admin build from .medusa/server/public/admin to public/admin
 * so "medusa start" (from project root) finds index.html.
 * Run after "medusa build" (see package.json build script).
 */
const fs = require("fs");
const path = require("path");

const cwd = process.cwd();
const src = path.join(cwd, ".medusa/server/public/admin");
const dest = path.join(cwd, "public/admin");

if (!fs.existsSync(src)) {
  console.warn("[copy-admin-build] No admin build at .medusa/server/public/admin, skipping copy.");
  process.exit(0);
}

fs.mkdirSync(path.join(cwd, "public"), { recursive: true });
fs.cpSync(src, dest, { recursive: true });
console.log("[copy-admin-build] Copied admin build to public/admin");
