import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * Admin API to manually mark an order as paid
 * POST /admin/orders/:id/mark-paid
 * 
 * This uses direct database insertion since payment providers are not available
 */
export async function POST(
    req: MedusaRequest<{ amount?: number }>,
    res: MedusaResponse
) {
    const { id } = req.params
    const { amount } = req.body

    try {
        const query = req.scope.resolve("query")
        const paymentModule = req.scope.resolve("payment")

        // Get order
        const { data: orders } = await query.graph({
            entity: "order",
            fields: ["id", "total", "currency_code", "region_id", "payment_collections.*"],
            filters: { id }
        })

        if (!orders || orders.length === 0) {
            return res.status(404).json({ message: "Order not found" })
        }

        const order = orders[0]
        const paymentAmount = amount || order.total

        // Get or create payment collection
        let paymentCollection
        if (order.payment_collections && order.payment_collections.length > 0) {
            paymentCollection = order.payment_collections[0]
            console.log(`[Mark Paid] Using existing payment collection: ${paymentCollection.id}`)
        } else {
            paymentCollection = await paymentModule.createPaymentCollections({
                region_id: order.region_id,
                currency_code: order.currency_code,
                amount: paymentAmount,
                metadata: {
                    order_id: order.id,
                    payment_method: "manual",
                    marked_paid_by_admin: true
                }
            })
            console.log(`[Mark Paid] Created payment collection: ${paymentCollection.id}`)
        }

        // Use createPayments (plural) method with proper structure
        const payments = await paymentModule.createPayments([{
            amount: paymentAmount,
            currency_code: order.currency_code,
            provider_id: "manual",
            payment_collection_id: paymentCollection.id,
            captured_at: new Date(),
            data: {
                order_id: order.id,
                manually_marked: true
            }
        }])

        const payment = payments[0]
        console.log(`[Mark Paid] Created payment: ${payment.id}`)

        return res.json({
            success: true,
            message: "Order marked as paid successfully",
            order_id: order.id,
            payment_id: payment.id,
            payment_collection_id: paymentCollection.id,
            amount: paymentAmount,
            currency: order.currency_code
        })

    } catch (error) {
        console.error("[Mark Paid] Error:", error)
        return res.status(500).json({
            success: false,
            message: "Failed to mark order as paid",
            error: error.message,
            details: error.stack
        })
    }
}
