import { model } from "@medusajs/framework/utils"

/**
 * UsageCounter tracks consumption for subscriptions
 * Stores data and voice usage per billing cycle
 */
const UsageCounter = model.define("usage_counter", {
    id: model.id().primaryKey(),
    subscription_id: model.text(),

    // Period tracking
    period_month: model.number(), // 1-12
    period_year: model.number(),  // e.g., 2024

    // Usage tracking (in MB and minutes)
    data_used_mb: model.number().default(0),
    voice_used_min: model.number().default(0),
})

export default UsageCounter
