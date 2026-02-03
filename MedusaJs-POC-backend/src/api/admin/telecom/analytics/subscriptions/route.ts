import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import TelecomCoreModuleService from "@modules/telecom-core/service"

/**
 * Admin API: Subscription Analytics
 * 
 * GET /admin/telecom/analytics/subscriptions
 */
export async function GET(
    req: MedusaRequest,
    res: MedusaResponse
) {
    const telecomModule: TelecomCoreModuleService = req.scope.resolve("telecom")

    try {
        // Get all subscriptions
        const subscriptions = await telecomModule.listSubscriptions({})

        // Count by status
        const active = subscriptions.filter(s => s.status === "active").length
        const suspended = subscriptions.filter(s => s.status === "suspended").length
        const barred = subscriptions.filter(s => (s as any).status === "barred").length

        return res.json({
            total_subscriptions: subscriptions.length,
            active_subscriptions: active,
            suspended_subscriptions: suspended,
            barred_subscriptions: barred,
            breakdown: {
                active: {
                    count: active,
                    percentage: ((active / subscriptions.length) * 100).toFixed(1)
                },
                suspended: {
                    count: suspended,
                    percentage: ((suspended / subscriptions.length) * 100).toFixed(1)
                },
                barred: {
                    count: barred,
                    percentage: ((barred / subscriptions.length) * 100).toFixed(1)
                }
            }
        })

    } catch (error) {
        console.error("[Admin API] Error calculating subscription metrics:", error)

        return res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to calculate subscription metrics"
        })
    }
}
