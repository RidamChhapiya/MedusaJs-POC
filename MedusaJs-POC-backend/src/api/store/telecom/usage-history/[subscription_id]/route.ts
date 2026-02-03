import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import TelecomCoreModuleService from "@modules/telecom-core/service"

/**
 * Store API: Get Usage History
 * 
 * GET /store/telecom/usage-history/:subscription_id
 */
export async function GET(
    req: MedusaRequest<{ subscription_id: string }>,
    res: MedusaResponse
) {
    const { subscription_id } = req.params
    const telecomModule: TelecomCoreModuleService = req.scope.resolve("telecom")

    try {
        // Get subscription
        const [subscription] = await telecomModule.listSubscriptions({ id: subscription_id })

        if (!subscription) {
            return res.status(404).json({
                error: "Subscription not found"
            })
        }

        // Get all usage counters for this subscription
        const allUsage = await telecomModule.listUsageCounters({
            subscription_id
        })

        // Sort by period (newest first)
        const sortedUsage = allUsage.sort((a, b) => {
            const aDate = new Date(a.period_year, a.period_month - 1)
            const bDate = new Date(b.period_year, b.period_month - 1)
            return bDate.getTime() - aDate.getTime()
        })

        // Get current period
        const now = new Date()
        const currentMonth = now.getMonth() + 1
        const currentYear = now.getFullYear()

        const currentPeriod = sortedUsage.find(
            u => u.period_month === currentMonth && u.period_year === currentYear
        )

        // Format history
        const history = sortedUsage.map(usage => ({
            period: `${usage.period_year}-${String(usage.period_month).padStart(2, '0')}`,
            data_used_mb: usage.data_used_mb,
            voice_used_min: usage.voice_used_min,
            period_month: usage.period_month,
            period_year: usage.period_year
        }))

        return res.json({
            subscription_id,
            current_period: currentPeriod ? {
                period: `${currentPeriod.period_year}-${String(currentPeriod.period_month).padStart(2, '0')}`,
                data_used_mb: currentPeriod.data_used_mb,
                voice_used_min: currentPeriod.voice_used_min
            } : null,
            history,
            total_records: history.length
        })

    } catch (error) {
        console.error("[Store API] Error fetching usage history:", error)

        return res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to fetch usage history"
        })
    }
}
