import { model } from "@medusajs/framework/utils"

/**
 * MsisdnInventory represents the phone number pool
 * Tracks availability status, tier, regional assignment, and customer ownership
 */
const MsisdnInventory = model.define("msisdn_inventory", {
    id: model.id().primaryKey(),
    phone_number: model.text().unique(),
    status: model.enum(["available", "reserved", "active", "cooling_down"]),
    tier: model.enum(["standard", "gold", "platinum"]),
    region_code: model.text(),

    // Customer Linking
    customer_id: model.text().nullable(), // Link to customer who owns/reserved this number
    reserved_at: model.dateTime().nullable(),
    activated_at: model.dateTime().nullable(),
    reservation_expires_at: model.dateTime().nullable(), // 15 min expiry for reservations
})

export default MsisdnInventory
