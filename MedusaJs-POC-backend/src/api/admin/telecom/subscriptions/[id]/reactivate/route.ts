import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import TelecomCoreModuleService from "@modules/telecom-core/service"
import { Modules } from "@medusajs/framework/utils"

/**
 * Admin API: Reactivate Subscription
 * 
 * POST /admin/telecom/subscriptions/:id/reactivate
 * 
 * Reactivates a suspended subscription after payment or issue resolution
 */
export async function POST(
    req: MedusaRequest<{ id: string }>,
    res: MedusaResponse
) {
    const { id } = req.params
    const { payment_verified = false } = req.body as {
        payment_verified?: boolean
    }

    const telecomModule: TelecomCoreModuleService = req.scope.resolve("telecom")
    const eventBus = req.scope.resolve(Modules.EVENT_BUS)

    try {
        console.log(`[Admin API] Reactivating subscription: ${id}`)

        // Get subscription
        const [subscription] = await telecomModule.listSubscriptions({ id })

        if (!subscription) {
            return res.status(404).json({
                error: "Subscription not found"
            })
        }

        if (subscription.status !== "suspended") {
            return res.status(400).json({
                error: `Cannot reactivate subscription with status: ${subscription.status}`
            })
        }

        // Update subscription status
        const updateResult = await telecomModule.updateSubscriptions({ id, status: "active" } as any)
        const updated = Array.isArray(updateResult) ? updateResult[0] : updateResult

        console.log(`[Admin API] Subscription reactivated`)

        // Emit event
        await eventBus.emit("telecom.subscription.reactivated" as any, {
            subscription_id: id,
            previous_status: subscription.status,
            payment_verified,
            reactivated_at: new Date()
        })

        return res.json({
            success: true,
            subscription: updated,
            message: "Subscription reactivated successfully"
        })

    } catch (error) {
        console.error("[Admin API] Error reactivating subscription:", error)

        return res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to reactivate subscription"
        })
    }
}
