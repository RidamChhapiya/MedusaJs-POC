import { model } from "@medusajs/framework/utils"

/**
 * CustomerProfile - Extended customer data for telecom services
 * 
 * This model stores telecom-specific customer information including:
 * - Personal and contact details
 * - Address information
 * - e-KYC verification status and documents
 * - Nexel subscriber status and owned numbers
 * - Preferences and settings
 * 
 * Note: created_at, updated_at, deleted_at are automatically added by MedusaJS
 */
const CustomerProfile = model.define("customer_profile", {
    id: model.id().primaryKey(),
    customer_id: model.text(), // Link to Medusa customer

    // Personal Details
    full_name: model.text(),
    date_of_birth: model.dateTime().nullable(),
    gender: model.enum(["male", "female", "other"]).nullable(),

    // Contact Details
    primary_phone: model.text(), // Non-Nexel number for contact
    alternate_phone: model.text().nullable(),
    email: model.text(),

    // Address Details
    address_line1: model.text(),
    address_line2: model.text().nullable(),
    city: model.text(),
    state: model.text(),
    pincode: model.text(),
    country: model.text().default("IN"),

    // e-KYC Details
    kyc_status: model.enum(["pending", "verified", "rejected"]).default("pending"),
    kyc_type: model.enum(["aadhaar", "pan", "passport", "driving_license"]).nullable(),
    kyc_number: model.text().nullable(),
    kyc_verified_at: model.dateTime().nullable(),
    kyc_document_url: model.text().nullable(), // For POC, just a mock URL

    // Account Details
    is_nexel_subscriber: model.boolean().default(false), // Has active Nexel SIM
    nexel_numbers: model.json().nullable(), // Array of Nexel MSISDNs owned
    registration_source: model.enum(["web", "app", "store"]).default("web"),

    // Preferences
    language_preference: model.text().default("en"),
    notification_preferences: model.json().nullable(),
})

export default CustomerProfile
