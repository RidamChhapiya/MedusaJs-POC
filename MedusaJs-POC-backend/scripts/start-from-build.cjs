/**
 * Start the Medusa server the way the framework expects in production.
 *
 * - If .medusa/server exists (after `medusa build`), we run from there so the
 *   admin build at .medusa/server/public/admin is found automatically (no copy needed).
 * - Otherwise we run `medusa start` from the project root (e.g. dev or no build yet).
 *
 * See: https://docs.medusajs.com/learn/build#start-built-medusa-application
 */
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");

const cwd = process.cwd();
const serverDir = path.join(cwd, ".medusa/server");

if (fs.existsSync(serverDir) && fs.existsSync(path.join(serverDir, "package.json"))) {
  process.chdir(serverDir);
  // Run medusa start directly so admin at .medusa/server/public/admin is served (no copy needed).
  // Use npx medusa start, not npm start, so we don't rely on .medusa/server/package.json scripts.
  execSync("npm install --omit=dev && npx medusa start", { stdio: "inherit" });
} else {
  execSync("npx medusa start", { stdio: "inherit", cwd });
}
