import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { runOrderDeliveryActions } from "../../../../../utils/run-delivery-actions"

/** Only allow complete-delivery for orders created in the last N minutes (called right after place order). */
const MAX_AGE_MINUTES = 10

/**
 * Store API: run delivery actions (capture, ship, deliver) for an order.
 * Called from the frontend right after place order so the order shows as delivered in Admin.
 * POST /store/orders/:id/complete-delivery
 *
 * Security: only allows orders created in the last 10 minutes (intended for use right after checkout).
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
    const orderId = req.params.id as string

    try {
        const query = req.scope.resolve("query")
        const { data: orders } = await query.graph({
            entity: "order",
            fields: ["id", "created_at"],
            filters: { id: orderId }
        })

        if (!orders?.length) {
            return res.status(404).json({ message: "Order not found" })
        }

        const order = orders[0]
        const created = order.created_at ? new Date(order.created_at) : null
        const cutoff = new Date(Date.now() - MAX_AGE_MINUTES * 60 * 1000)
        if (!created || created < cutoff) {
            return res.status(403).json({
                message: "Complete delivery is only allowed for recently placed orders (within 10 minutes)"
            })
        }

        const { results, errors } = await runOrderDeliveryActions(req.scope, orderId, {
            doCapture: true,
            doShip: true,
            doDeliver: true
        })

        return res.json({
            success: errors.length === 0,
            order_id: orderId,
            ...results
        })
    } catch (error: any) {
        console.error("[CompleteDelivery] Error:", error)
        return res.status(500).json({
            success: false,
            message: "Complete delivery failed",
            error: error?.message || String(error)
        })
    }
}
