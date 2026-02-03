import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import TelecomCoreModuleService from "@modules/telecom-core/service"
import { Modules } from "@medusajs/framework/utils"

/**
 * Admin API: Cancel Subscription
 * 
 * POST /admin/telecom/subscriptions/:id/cancel
 * 
 * Cancels a subscription and releases the phone number
 */
export async function POST(
    req: MedusaRequest<{ id: string }>,
    res: MedusaResponse
) {
    const { id } = req.params
    const { reason, immediate = false } = req.body as {
        reason?: string
        immediate?: boolean
    }

    const telecomModule: TelecomCoreModuleService = req.scope.resolve("telecom")
    const eventBus = req.scope.resolve(Modules.EVENT_BUS)

    try {
        console.log(`[Admin API] Cancelling subscription: ${id}`)
        console.log(`[Admin API] Immediate: ${immediate}, Reason: ${reason || 'Customer request'}`)

        // Get subscription
        const [subscription] = await telecomModule.listSubscriptions({ id })

        if (!subscription) {
            return res.status(404).json({
                error: "Subscription not found"
            })
        }

        if (subscription.status === "cancelled") {
            return res.status(400).json({
                error: "Subscription is already cancelled"
            })
        }

        // Update subscription status
        const updateResult = await telecomModule.updateSubscriptions({
            id,
            status: "cancelled"
        } as any)
        const updated = Array.isArray(updateResult) ? updateResult[0] : updateResult

        // Release MSISDN if exists (subscription has msisdn = phone number; look up inventory by phone_number)
        if (subscription.msisdn) {
            const [inv] = await telecomModule.listMsisdnInventories({ phone_number: subscription.msisdn })
            if (inv) {
                await telecomModule.updateMsisdnInventories({ id: inv.id, status: "available", customer_id: null } as any)
                console.log(`[Admin API] Released MSISDN: ${subscription.msisdn}`)
            }
        }

        // Emit event
        await eventBus.emit("telecom.subscription.cancelled" as any, {
            subscription_id: id,
            reason: reason || "Customer request",
            immediate,
            cancelled_at: new Date()
        })

        console.log(`[Admin API] Subscription cancelled`)

        return res.json({
            success: true,
            subscription: updated,
            message: "Subscription cancelled successfully"
        })

    } catch (error) {
        console.error("[Admin API] Error cancelling subscription:", error)

        return res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to cancel subscription"
        })
    }
}
