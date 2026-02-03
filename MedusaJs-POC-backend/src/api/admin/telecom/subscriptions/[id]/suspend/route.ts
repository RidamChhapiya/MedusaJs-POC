import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import TelecomCoreModuleService from "@modules/telecom-core/service"
import { Modules } from "@medusajs/framework/utils"

/**
 * Admin API: Suspend Subscription
 * 
 * POST /admin/telecom/subscriptions/:id/suspend
 * 
 * Manually suspends a subscription (e.g., for payment failure or customer request)
 */
export async function POST(
    req: MedusaRequest<{ id: string }>,
    res: MedusaResponse
) {
    const { id } = req.params
    const { reason, grace_period_days = 7 } = req.body as {
        reason?: string
        grace_period_days?: number
    }

    const telecomModule: TelecomCoreModuleService = req.scope.resolve("telecom")
    const eventBus = req.scope.resolve(Modules.EVENT_BUS)

    try {
        console.log(`[Admin API] Suspending subscription: ${id}`)
        console.log(`[Admin API] Reason: ${reason || 'Manual suspension'}`)

        // Get subscription
        const [subscription] = await telecomModule.listSubscriptions({ id })

        if (!subscription) {
            return res.status(404).json({
                error: "Subscription not found"
            })
        }

        if (subscription.status === "suspended") {
            return res.status(400).json({
                error: "Subscription is already suspended"
            })
        }

        // Calculate grace period end date
        const gracePeriodEnd = new Date()
        gracePeriodEnd.setDate(gracePeriodEnd.getDate() + grace_period_days)

        // Update subscription status
        const updateResult = await telecomModule.updateSubscriptions({ id, status: "suspended" } as any)
        const updated = Array.isArray(updateResult) ? updateResult[0] : updateResult

        console.log(`[Admin API] Subscription suspended until ${gracePeriodEnd.toISOString()}`)

        // Emit event
        await eventBus.emit("telecom.subscription.suspended" as any, {
            subscription_id: id,
            reason: reason || "Manual suspension",
            grace_period_end: gracePeriodEnd,
            suspended_at: new Date()
        })

        return res.json({
            success: true,
            subscription: updated,
            grace_period_end: gracePeriodEnd,
            message: `Subscription suspended. Grace period ends ${gracePeriodEnd.toLocaleDateString()}`
        })

    } catch (error) {
        console.error("[Admin API] Error suspending subscription:", error)

        return res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to suspend subscription"
        })
    }
}
