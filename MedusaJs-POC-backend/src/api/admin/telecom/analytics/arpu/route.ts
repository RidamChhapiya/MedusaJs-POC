import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import TelecomCoreModuleService from "@modules/telecom-core/service"

/**
 * Admin API: ARPU (Average Revenue Per User) Analytics
 * GET /admin/telecom/analytics/arpu
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const telecomModule: TelecomCoreModuleService = req.scope.resolve("telecom")

    try {
        const invoices = await telecomModule.listInvoices({})
        const subscriptions = await telecomModule.listSubscriptions({ status: "active" })

        const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total_amount, 0)
        const arpu = subscriptions.length > 0 ? totalRevenue / subscriptions.length : 0

        return res.json({
            arpu: arpu,
            total_revenue: totalRevenue,
            active_users: subscriptions.length,
            formatted_arpu: `₹${(arpu / 100).toFixed(2)}`,
            benchmark: arpu > 50000 ? "Above average" : arpu > 30000 ? "Average" : "Below average"
        })
    } catch (error) {
        return res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to calculate ARPU"
        })
    }
}
