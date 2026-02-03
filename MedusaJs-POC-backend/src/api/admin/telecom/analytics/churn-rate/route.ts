import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import TelecomCoreModuleService from "@modules/telecom-core/service"

/**
 * Admin API: Churn Rate Analytics
 * GET /admin/telecom/analytics/churn-rate
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const telecomModule: TelecomCoreModuleService = req.scope.resolve("telecom")
    const { period_days = 30 } = req.query as any

    try {
        const allSubscriptions = await telecomModule.listSubscriptions({})

        // Calculate churn: cancelled subscriptions / total subscriptions
        const totalSubs = allSubscriptions.length
        const cancelledSubs = allSubscriptions.filter(s =>
            (s as any).metadata?.cancelled_date &&
            new Date((s as any).metadata.cancelled_date) > new Date(Date.now() - parseInt(period_days) * 24 * 60 * 60 * 1000)
        ).length

        const churnRate = totalSubs > 0 ? (cancelledSubs / totalSubs) * 100 : 0

        return res.json({
            churn_rate: parseFloat(churnRate.toFixed(2)),
            total_subscriptions: totalSubs,
            cancelled_subscriptions: cancelledSubs,
            period_days: parseInt(period_days),
            analysis: churnRate < 5 ? "Excellent" : churnRate < 10 ? "Good" : "Needs attention"
        })
    } catch (error) {
        return res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to calculate churn rate"
        })
    }
}
