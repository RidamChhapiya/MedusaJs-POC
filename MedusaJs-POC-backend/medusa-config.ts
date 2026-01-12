import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd()

)

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
    redisUrl: process.env.REDIS_URL,
  },
  modules: [
    {
      resolve: "./src/modules/telecom-core",
      key: "telecom",
    },
//     {
//   resolve: "@medusajs/medusa/payment",
//   options: {
//     providers: [
//       {
//         // Check if your version requires '@medusajs/payment-manual' 
//         // instead of the sub-path '@medusajs/medusa/payment-manual'
//         resolve: "@medusajs/medusa/payment-manual", 
//         id: "manual",
//         options: {},
//       },
//     ],
//   },
// },

  ],
})
