import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

module.exports = defineConfig({
  // Admin: in production we run from .medusa/server (see scripts/start-from-build.cjs), so the
  // loader finds the admin at .medusa/server/public/admin automatically. No copy step needed.
  // Set DISABLE_ADMIN=true to skip serving admin.
  admin: {
    disable: process.env.DISABLE_ADMIN === "true",
  },
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
    // Only set redisUrl if REDIS_URL is explicitly provided
    // If not set, Medusa will use in-memory alternatives for event bus, caching, etc.
    ...(process.env.REDIS_URL && { redisUrl: process.env.REDIS_URL }),
  },
  modules: [
    {
      resolve: "./src/modules/telecom-core",
      key: "telecom",
    },
    {
      resolve: "@medusajs/medusa/notification",
      options: {
        providers: [
          {
            resolve: "./src/modules/notification-gmail",
            id: "gmail",
            options: {
              channels: ["email"],
              user: process.env.GMAIL_USER || "",
              pass: process.env.GMAIL_APP_PASSWORD || "",
            },
          },
        ],
      },
    },
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/payment-stripe",
            id: "stripe",
            options: {
              apiKey: process.env.STRIPE_API_KEY,
              webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
              capture: true, // capture payment automatically (no manual capture in Admin)
            },
          },
        ],
      },
    },
  ],
})
