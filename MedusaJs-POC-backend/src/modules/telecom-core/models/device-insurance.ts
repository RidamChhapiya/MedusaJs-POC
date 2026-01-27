import { model } from "@medusajs/framework/utils"

/**
 * Device Insurance Model
 * 
 * Tracks device insurance policies
 */
const DeviceInsurance = model.define("device_insurance", {
    id: model.id().primaryKey(),

    // Relationships
    subscription_id: model.text(),
    device_product_id: model.text(),

    // Coverage details
    coverage_type: model.enum(["damage", "theft", "loss", "comprehensive"]),

    // Pricing (in cents/paise)
    monthly_premium: model.number(),
    claim_limit: model.number(), // Maximum claim amount

    // Policy period
    start_date: model.dateTime(),
    end_date: model.dateTime(),

    // Claim tracking
    claims_made: model.number().default(0),
    last_claim_date: model.dateTime().nullable(),

    // Status
    status: model.enum([
        "active",
        "cancelled",
        "expired",
        "claimed"
    ]).default("active"),

    // Metadata
    metadata: model.json().nullable(),
})

export default DeviceInsurance
