import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import TelecomCoreModuleService from "@modules/telecom-core/service"

/**
 * Admin API: Get Subscription Details
 * 
 * GET /admin/telecom/subscriptions/:id
 * 
 * Retrieves detailed information about a specific subscription
 */
export async function GET(
    req: MedusaRequest<{ id: string }>,
    res: MedusaResponse
) {
    const { id } = req.params
    const telecomModule: TelecomCoreModuleService = req.scope.resolve("telecom")

    try {
        console.log(`[Admin API] Fetching subscription: ${id}`)

        // Get subscription
        const [subscription] = await telecomModule.listSubscriptions({ id })

        if (!subscription) {
            return res.status(404).json({
                error: "Subscription not found"
            })
        }

        // Get MSISDN details (subscription has msisdn = phone number)
        let msisdnDetails: { id: string; phone_number: string } | null = null
        if (subscription.msisdn) {
            const [inv] = await telecomModule.listMsisdnInventories({ phone_number: subscription.msisdn })
            msisdnDetails = inv || null
        }

        // Get current usage
        const now = new Date()
        const currentMonth = now.getMonth() + 1
        const currentYear = now.getFullYear()

        const usageCounters = await telecomModule.listUsageCounters({
            subscription_id: id,
            period_month: currentMonth,
            period_year: currentYear
        })

        const currentUsage = usageCounters.length > 0 ? usageCounters[0] : null

        return res.json({
            subscription,
            msisdn: msisdnDetails,
            current_usage: currentUsage
        })

    } catch (error) {
        console.error("[Admin API] Error fetching subscription:", error)

        return res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to fetch subscription"
        })
    }
}
