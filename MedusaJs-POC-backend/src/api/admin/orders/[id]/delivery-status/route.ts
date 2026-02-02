import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * Get delivery-related status for an order (what actions are still available).
 * GET /admin/orders/:id/delivery-status
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const orderId = req.params.id as string
    const query = req.scope.resolve("query")
    const paymentModule = req.scope.resolve("payment")

    try {
        const { data: orders } = await query.graph({
            entity: "order",
            fields: [
                "id",
                "items.id",
                "items.quantity",
                "payment_collections.id",
                "fulfillments.id",
                "fulfillments.shipped_at",
                "fulfillments.delivered_at",
                "shipping_methods.id"
            ],
            filters: { id: orderId }
        })

        if (!orders?.length) {
            return res.status(404).json({ message: "Order not found" })
        }

        const order = orders[0]
        let payment_captured = true
        let has_payment_collection = !!(order.payment_collections?.length)

        if (has_payment_collection && order.payment_collections?.length) {
            const payments = await paymentModule.listPayments({
                payment_collection_id: [order.payment_collections[0].id]
            })
            payment_captured = payments.length > 0 && payments.every((p: { captured_at?: Date | null }) => !!p.captured_at)
        } else {
            payment_captured = false
        }

        const fulfillments = order.fulfillments || []
        const all_shipped = fulfillments.length > 0 && fulfillments.every((f: { shipped_at?: Date | null }) => !!f.shipped_at)
        const all_delivered = fulfillments.length > 0 && fulfillments.every((f: { delivered_at?: Date | null }) => !!f.delivered_at)
        const has_items_to_fulfill = !!(order.items?.length)

        return res.json({
            order_id: orderId,
            payment: {
                has_collection: has_payment_collection,
                captured: payment_captured,
                can_capture: has_payment_collection && !payment_captured
            },
            fulfillment: {
                has_items: has_items_to_fulfill,
                fulfillments_count: fulfillments.length,
                all_shipped: all_shipped,
                all_delivered: all_delivered,
                can_ship: has_items_to_fulfill,
                can_deliver: fulfillments.some((f: { shipped_at?: Date | null; delivered_at?: Date | null }) => !!f.shipped_at && !f.delivered_at)
            }
        })
    } catch (error: any) {
        console.error("[DeliveryStatus] Error:", error)
        return res.status(500).json({
            message: "Failed to get delivery status",
            error: error?.message || String(error)
        })
    }
}
