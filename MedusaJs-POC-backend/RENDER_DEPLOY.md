# Render deployment checklist

This doc confirms why the current setup fixes the errors you saw.

## What went wrong before

1. **"No open ports detected"** – The server never bound to a port (process was killed by OOM before listening, or start script never reached `medusa start`).
2. **"Out of memory (used over 512Mi)"** – The previous start script ran `npm install --omit=dev` inside `.medusa/server` at runtime, doubling install work and memory use.

## Current fix (what we use now)

| Step | What runs | Result |
|------|-----------|--------|
| **Build** | `npm run build` → `npx medusa build` then `node scripts/copy-admin-build.cjs` | Backend + admin built; admin copied to `public/admin` so the server (running from project root) can serve it. |
| **Start** | `npm run start` → `npx medusa start` | Single process, no extra install. CLI uses `process.env.PORT` (Render sets this). Server binds to that port. Admin is loaded from `public/admin` (loader uses `rootDirectory` = project root). |

## Why this fixes both errors

- **Port:** Medusa CLI (`@medusajs/cli`) defaults the `start` command’s port to `process.env.PORT || "9000"`. Render sets `PORT`, so the server binds to Render’s port and Render sees an open port.
- **Memory:** No `npm install` at start; only one `node_modules` (at project root). No duplicate install in `.medusa/server`, so no extra memory spike from that.
- **Admin UI:** Build copies admin to `public/admin`. On start, the admin loader looks for `path.join(rootDirectory, "./public/admin")`. When you run from the project root (as on Render), `rootDirectory` is that root, so it finds `public/admin` and serves the admin UI.

## Render settings to use

- **Root Directory:** `MedusaJs-POC-backend` (so build and start both run in the backend folder).
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm run start`
- **Instance type:** If you still hit OOM after this, increase to 1 GB; the app itself no longer does a second install at start.

You do not need to set `PORT` in Render; it is set automatically.
