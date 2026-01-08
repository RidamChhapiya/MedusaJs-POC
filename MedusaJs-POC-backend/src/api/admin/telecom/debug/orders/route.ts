import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * Debug endpoint to check telecom orders
 * GET /admin/telecom/debug/orders
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
    try {
        // Check if any orders exist with telecom metadata
        const orderModule = req.scope.resolve("order")

        // Get all orders
        const orders = await orderModule.listOrders({}, {
            take: 50,
            relations: ["items"]
        })

        // Filter for telecom orders
        const telecomOrders = orders.filter(order =>
            order.metadata &&
            (order.metadata.order_type === 'sim_purchase' || order.metadata.order_type === 'recharge')
        )

        return res.json({
            total_orders: orders.length,
            telecom_orders: telecomOrders.length,
            orders: telecomOrders.map(o => ({
                id: o.id,
                status: o.status,
                created_at: o.created_at,
                metadata: o.metadata,
                items_count: o.items?.length || 0
            }))
        })

    } catch (error) {
        console.error("[Debug Orders] Error:", error)
        return res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to fetch orders",
            stack: error instanceof Error ? error.stack : undefined
        })
    }
}
