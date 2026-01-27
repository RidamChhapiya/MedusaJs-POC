import { model } from "@medusajs/framework/utils"

const PlanConfiguration = model.define("plan_configuration", {
    id: model.id().primaryKey(),
    product_id: model.text().nullable(), // Link to Medusa Product for sync
    name: model.text().nullable(),
    description: model.text().nullable(),
    price: model.number().nullable(), // in paise (₹599 = 59900)
    validity_days: model.number().nullable(), // e.g., 28, 30, 365
    data_quota_mb: model.number(), // in MB
    voice_quota_min: model.number(), // in minutes, 999999 = unlimited
    type: model.enum(["prepaid", "postpaid"]).default("prepaid"),
    contract_months: model.number().default(0), // 0 for prepaid, 12/24 for postpaid
    is_5g: model.boolean().default(false),
    is_active: model.boolean().default(true),
})

export default PlanConfiguration
