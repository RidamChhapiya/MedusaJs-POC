import { model } from "@medusajs/framework/utils"

/**
 * Family Plan Model
 * 
 * Manages family plans with shared quotas
 */
const FamilyPlan = model.define("family_plan", {
    id: model.id().primaryKey(),

    // Relationships
    primary_subscription_id: model.text(),
    plan_name: model.text(),

    // Shared quotas (total for all members)
    total_data_quota_mb: model.number(),
    total_voice_quota_min: model.number(),

    // Shared usage tracking
    shared_data_used_mb: model.number().default(0),
    shared_voice_used_min: model.number().default(0),

    // Member limits
    max_members: model.number().default(5),
    current_members: model.number().default(1), // Primary member

    // Status
    status: model.enum([
        "active",
        "suspended",
        "cancelled"
    ]).default("active"),

    // Metadata
    metadata: model.json().nullable(),
})

export default FamilyPlan
