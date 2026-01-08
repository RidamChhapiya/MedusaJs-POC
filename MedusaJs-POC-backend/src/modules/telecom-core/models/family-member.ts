import { model } from "@medusajs/framework/utils"

/**
 * Family Member Model
 * 
 * Tracks individual members in a family plan
 */
const FamilyMember = model.define("family_member", {
    id: model.id().primaryKey(),

    // Relationships
    family_plan_id: model.text(),
    subscription_id: model.text(),

    // Member details
    member_type: model.enum(["primary", "secondary"]),

    // Dates
    joined_date: model.dateTime(),
    removed_date: model.dateTime().nullable(),

    // Status
    status: model.enum([
        "active",
        "removed"
    ]).default("active"),

    // Metadata
    metadata: model.json().nullable(),
})

export default FamilyMember
