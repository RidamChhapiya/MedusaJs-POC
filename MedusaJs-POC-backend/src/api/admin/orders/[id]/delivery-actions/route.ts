import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { runOrderDeliveryActions } from "../../../../../utils/run-delivery-actions"

type DeliveryActionsBody = {
    capture?: boolean
    ship?: boolean
    deliver?: boolean
}

/**
 * Simple delivery service: run capture payment, create fulfillment (ship), and/or mark as delivered.
 * POST /admin/orders/:id/delivery-actions
 * Body: { capture?: boolean, ship?: boolean, deliver?: boolean } (default all true)
 */
export async function POST(
    req: MedusaRequest<DeliveryActionsBody>,
    res: MedusaResponse
) {
    const orderId = req.params.id as string
    const body = (req.body || {}) as DeliveryActionsBody

    try {
        const { results, errors } = await runOrderDeliveryActions(req.scope, orderId, {
            doCapture: body.capture !== false,
            doShip: body.ship !== false,
            doDeliver: body.deliver !== false,
            actorId: req.auth_context?.actor_id
        })

        return res.json({
            success: errors.length === 0,
            order_id: orderId,
            ...results
        })
    } catch (error: any) {
        console.error("[DeliveryActions] Error:", error)
        return res.status(500).json({
            success: false,
            message: "Delivery actions failed",
            error: error?.message || String(error)
        })
    }
}
