import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import TelecomCoreModuleService from "../../../../../modules/telecom-core/service"

/**
 * Activate SIM after order fulfillment
 * POST /admin/telecom/orders/:order_id/activate-sim
 * 
 * This endpoint is called when admin fulfills a SIM purchase order.
 * It activates the MSISDN and subscription.
 */
export async function POST(
    req: MedusaRequest,
    res: MedusaResponse
) {
    const telecomModule: TelecomCoreModuleService = req.scope.resolve("telecom")
    const orderModule = req.scope.resolve("order")

    try {
        const { order_id } = req.params

        // Get order with metadata
        const orders = await orderModule.listOrders({ id: [order_id] })
        const order = orders[0]

        if (!order) {
            return res.status(404).json({ error: "Order not found" })
        }

        const { subscription_id, msisdn, order_type } = order.metadata || {}

        if (order_type !== "sim_purchase") {
            return res.status(400).json({
                error: "This endpoint is only for SIM purchase orders"
            })
        }

        if (!subscription_id || !msisdn) {
            return res.status(400).json({
                error: "Order missing subscription_id or msisdn in metadata"
            })
        }

        // Activate MSISDN
        const msisdns = await telecomModule.listMsisdnInventories({
            phone_number: msisdn
        })

        if (msisdns.length > 0) {
            await telecomModule.updateMsisdnInventories({
                id: msisdns[0].id,
                status: "active",
                activated_at: new Date()
            })
            console.log(`[SIM Activation] Activated MSISDN ${msisdn}`)
        }

        // Activate subscription
        await telecomModule.updateSubscriptions({
            id: subscription_id,
            status: "active"
        })
        console.log(`[SIM Activation] Activated subscription ${subscription_id}`)

        // Update order metadata
        await orderModule.updateOrders({
            id: order_id,
            metadata: {
                ...order.metadata,
                sim_activated: true,
                activated_at: new Date().toISOString()
            }
        })

        return res.json({
            success: true,
            message: "SIM activated successfully",
            msisdn,
            subscription_id
        })

    } catch (error) {
        console.error("[SIM Activation] Error:", error)
        return res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to activate SIM"
        })
    }
}
