import { model } from "@medusajs/framework/utils"

/**
 * Porting Request Model
 * 
 * Tracks number porting (MNP) requests
 */
const PortingRequest = model.define("porting_request", {
    id: model.id().primaryKey(),

    // Relationships
    customer_id: model.text(),
    msisdn: model.text(),

    // Porting details
    donor_operator: model.text(), // Previous carrier
    port_type: model.enum(["port-in", "port-out"]),

    // Status tracking
    status: model.enum([
        "pending",
        "approved",
        "in-progress",
        "completed",
        "rejected",
        "cancelled"
    ]).default("pending"),

    // Dates
    requested_date: model.dateTime(),
    scheduled_date: model.dateTime().nullable(),
    completed_date: model.dateTime().nullable(),

    // Rejection details
    rejection_reason: model.text().nullable(),

    // Metadata
    metadata: model.json().nullable(),
})

export default PortingRequest
