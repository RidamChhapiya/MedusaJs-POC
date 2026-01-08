import { model } from "@medusajs/framework/utils"

/**
 * Device Contract Model
 * 
 * Tracks device subsidization and installment payments
 */
const DeviceContract = model.define("device_contract", {
    id: model.id().primaryKey(),

    // Relationships
    subscription_id: model.text(),
    device_product_id: model.text(),
    customer_id: model.text(),

    // Pricing (in cents/paise)
    device_price: model.number(),
    down_payment: model.number().default(0),
    installment_amount: model.number(),

    // Installment tracking
    installment_count: model.number(), // Total installments (e.g., 12, 24)
    installments_paid: model.number().default(0),

    // Contract dates
    contract_start_date: model.dateTime(),
    contract_end_date: model.dateTime(),
    next_payment_date: model.dateTime(),

    // Status
    status: model.enum([
        "active",
        "completed",
        "terminated",
        "defaulted"
    ]).default("active"),

    // Early termination
    early_termination_fee: model.number(),

    // Metadata
    metadata: model.json().nullable(),
})

export default DeviceContract
