import { model } from "@medusajs/framework/utils"

/**
 * Invoice Model
 * 
 * Stores billing invoices for subscriptions
 */
const Invoice = model.define("invoice", {
    id: model.id().primaryKey(),

    // Relationships
    customer_id: model.text(),
    subscription_id: model.text(),

    // Invoice details
    invoice_number: model.text().unique(),

    // Amounts (in cents/paise)
    subtotal: model.number(),
    tax_amount: model.number().default(0),
    total_amount: model.number(),

    // Dates
    issue_date: model.dateTime(),
    due_date: model.dateTime(),
    paid_date: model.dateTime().nullable(),

    // Status
    status: model.enum([
        "draft",
        "pending",
        "paid",
        "overdue",
        "cancelled"
    ]).default("pending"),

    // Line items (JSON)
    line_items: model.json(),

    // PDF storage
    pdf_url: model.text().nullable(),

    // Payment details
    payment_method: model.text().nullable(),
    payment_reference: model.text().nullable(),

    // Metadata
    notes: model.text().nullable(),
    metadata: model.json().nullable(),
})

export default Invoice
