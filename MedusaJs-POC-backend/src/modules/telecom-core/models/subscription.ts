import { model } from "@medusajs/framework/utils"

/**
 * Subscription is the central record of an active telecom line
 * Links to Customer, Plan, and MSISDN
 */
const Subscription = model.define("subscription", {
    id: model.id().primaryKey(),
    customer_id: model.text(),
    plan_id: model.text(), // Link to PlanConfiguration
    msisdn: model.text(), // Phone number
    status: model.enum(["active", "suspended", "expired", "cancelled"]),
    start_date: model.dateTime(),
    end_date: model.dateTime(),
    data_balance_mb: model.number(),
    voice_balance_min: model.number(),
    auto_renew: model.boolean().default(false),
})

export default Subscription
