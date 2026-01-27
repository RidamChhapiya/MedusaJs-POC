import { model } from "@medusajs/framework/utils"

/**
 * Payment Attempt Model
 * 
 * Tracks payment retry attempts for failed transactions
 */
const PaymentAttempt = model.define("payment_attempt", {
    id: model.id().primaryKey(),

    // Relationships
    subscription_id: model.text(),
    invoice_id: model.text().nullable(),

    // Attempt details
    attempt_number: model.number().default(1),

    // Status
    status: model.enum([
        "pending",
        "processing",
        "success",
        "failed",
        "cancelled"
    ]).default("pending"),

    // Payment details (amount in cents/paise)
    amount: model.number(),
    payment_method: model.text().nullable(),

    // Error tracking
    error_code: model.text().nullable(),
    error_message: model.text().nullable(),

    // Retry scheduling
    next_retry_date: model.dateTime().nullable(),
    max_retries: model.number().default(3),

    // Timestamps
    attempted_at: model.dateTime(),
    completed_at: model.dateTime().nullable(),

    // Metadata
    metadata: model.json().nullable(),
})

export default PaymentAttempt
