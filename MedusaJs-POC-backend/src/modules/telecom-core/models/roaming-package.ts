import { model } from "@medusajs/framework/utils"

/**
 * Roaming Package Model
 * 
 * Tracks international roaming packages
 */
const RoamingPackage = model.define("roaming_package", {
    id: model.id().primaryKey(),

    // Relationships
    subscription_id: model.text(),

    // Package details
    package_type: model.enum(["data-only", "voice-only", "combo"]),
    destination_country: model.text(),

    // Quotas
    data_quota_mb: model.number().default(0),
    voice_quota_min: model.number().default(0),

    // Pricing (in cents/paise)
    price: model.number(),
    validity_days: model.number(),

    // Dates
    activation_date: model.dateTime(),
    expiry_date: model.dateTime(),

    // Status
    status: model.enum([
        "active",
        "expired",
        "cancelled"
    ]).default("active"),

    // Metadata
    metadata: model.json().nullable(),
})

export default RoamingPackage
