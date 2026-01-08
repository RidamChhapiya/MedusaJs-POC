import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import TelecomCoreModuleService from "../../../../../../modules/telecom-core/service"

/**
 * Store API: Export Usage History
 * 
 * GET /store/telecom/usage-history/:subscription_id/export?format=csv
 */
export async function GET(
    req: MedusaRequest<{ subscription_id: string }>,
    res: MedusaResponse
) {
    const { subscription_id } = req.params
    const { format = 'csv' } = req.query as { format?: string }

    const telecomModule: TelecomCoreModuleService = req.scope.resolve("telecom")

    try {
        // Get subscription
        const [subscription] = await telecomModule.listSubscriptions({ id: subscription_id })

        if (!subscription) {
            return res.status(404).json({
                error: "Subscription not found"
            })
        }

        // Get all usage counters
        const allUsage = await telecomModule.listUsageCounters({
            subscription_id
        })

        // Sort by period
        const sortedUsage = allUsage.sort((a, b) => {
            const aDate = new Date(a.period_year, a.period_month - 1)
            const bDate = new Date(b.period_year, b.period_month - 1)
            return aDate.getTime() - bDate.getTime()
        })

        if (format === 'csv') {
            // Generate CSV
            let csv = 'Period,Data Used (MB),Voice Used (Min)\n'

            for (const usage of sortedUsage) {
                const period = `${usage.period_year}-${String(usage.period_month).padStart(2, '0')}`
                csv += `${period},${usage.data_used_mb},${usage.voice_used_min}\n`
            }

            res.setHeader('Content-Type', 'text/csv')
            res.setHeader('Content-Disposition', `attachment; filename="usage-history-${subscription_id}.csv"`)

            return res.send(csv)
        }

        // Default: JSON
        return res.json({
            subscription_id,
            history: sortedUsage.map(usage => ({
                period: `${usage.period_year}-${String(usage.period_month).padStart(2, '0')}`,
                data_used_mb: usage.data_used_mb,
                voice_used_min: usage.voice_used_min
            }))
        })

    } catch (error) {
        console.error("[Store API] Error exporting usage history:", error)

        return res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to export usage history"
        })
    }
}
