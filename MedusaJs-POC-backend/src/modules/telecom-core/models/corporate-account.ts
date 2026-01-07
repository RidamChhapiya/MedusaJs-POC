import { model } from "@medusajs/framework/utils"

/**
 * Corporate Account Model
 * 
 * Manages corporate/enterprise accounts with bulk subscriptions
 */
const CorporateAccount = model.define("corporate_account", {
    id: model.id().primaryKey(),

    // Company details
    company_name: model.text(),
    billing_contact_id: model.text(),

    // Subscription management
    total_subscriptions: model.number().default(0),
    bulk_discount_percentage: model.number().default(0), // e.g., 10 for 10%

    // Billing settings
    centralized_billing: model.boolean().default(true),
    payment_terms: model.enum(["net-15", "net-30", "net-60", "net-90"]).default("net-30"),

    // Status
    status: model.enum([
        "active",
        "suspended",
        "cancelled"
    ]).default("active"),

    // Metadata
    metadata: model.json().nullable(),
})

export default CorporateAccount
