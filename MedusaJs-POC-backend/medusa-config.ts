import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

module.exports = defineConfig({
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
      resolve: "@medusajs/medusa/payment",
      // System payment provider (pp_system_default) is built-in and available by default
      // No additional configuration needed
    },
  ],
})
