import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import TelecomCoreModuleService from "../../../../modules/telecom-core/service"

/**
 * Admin API: Customer Lifetime Value (LTV) Analytics
 * GET /admin/telecom/analytics/customer-ltv
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const telecomModule: TelecomCoreModuleService = req.scope.resolve("telecom")

    try {
        const invoices = await telecomModule.listInvoices({ status: "paid" })
        const subscriptions = await telecomModule.listSubscriptions({ status: "active" })

        // Calculate average monthly revenue
        const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total_amount, 0)
        const avgMonthlyRevenue = subscriptions.length > 0 ? totalRevenue / subscriptions.length : 0

        // Assume average customer lifespan of 24 months (industry standard)
        const avgLifespanMonths = 24
        const customerLTV = avgMonthlyRevenue * avgLifespanMonths

        return res.json({
            customer_ltv: customerLTV,
            avg_monthly_revenue: avgMonthlyRevenue,
            avg_lifespan_months: avgLifespanMonths,
            total_active_customers: subscriptions.length,
            total_paid_invoices: invoices.length,
            formatted_ltv: `₹${(customerLTV / 100).toFixed(2)}`
        })
    } catch (error) {
        return res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to calculate customer LTV"
        })
    }
}
