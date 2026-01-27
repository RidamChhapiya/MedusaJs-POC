import { model } from "@medusajs/framework/utils"

/**
 * Corporate Subscription Model
 * 
 * Links subscriptions to corporate accounts
 */
const CorporateSubscription = model.define("corporate_subscription", {
    id: model.id().primaryKey(),

    // Relationships
    corporate_account_id: model.text(),
    subscription_id: model.text(),

    // Employee details
    employee_name: model.text(),
    employee_email: model.text().nullable(),
    department: model.text().nullable(),

    // Assignment tracking
    assigned_date: model.dateTime(),
    removed_date: model.dateTime().nullable(),

    // Status
    status: model.enum([
        "active",
        "removed"
    ]).default("active"),

    // Metadata
    metadata: model.json().nullable(),
})

export default CorporateSubscription
