import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import TelecomCoreModuleService from "../../../../modules/telecom-core/service"

/**
 * Admin API: Revenue Analytics
 * 
 * GET /admin/telecom/analytics/revenue
 */
export async function GET(
    req: MedusaRequest,
    res: MedusaResponse
) {
    const telecomModule: TelecomCoreModuleService = req.scope.resolve("telecom")
    const { start_date, end_date } = req.query as { start_date?: string; end_date?: string }

    try {
        // Get all invoices
        const invoices = await telecomModule.listInvoices({})

        // Filter by date if provided
        let filteredInvoices = invoices
        if (start_date || end_date) {
            filteredInvoices = invoices.filter(inv => {
                const issueDate = new Date(inv.issue_date)
                if (start_date && issueDate < new Date(start_date)) return false
                if (end_date && issueDate > new Date(end_date)) return false
                return true
            })
        }

        // Calculate metrics
        const totalRevenue = filteredInvoices.reduce((sum, inv) => sum + inv.total_amount, 0)
        const paidRevenue = filteredInvoices
            .filter(inv => inv.status === "paid")
            .reduce((sum, inv) => sum + inv.total_amount, 0)
        const pendingRevenue = filteredInvoices
            .filter(inv => inv.status === "pending")
            .reduce((sum, inv) => sum + inv.total_amount, 0)

        return res.json({
            total_revenue: totalRevenue,
            paid_revenue: paidRevenue,
            pending_revenue: pendingRevenue,
            total_invoices: filteredInvoices.length,
            paid_invoices: filteredInvoices.filter(inv => inv.status === "paid").length,
            pending_invoices: filteredInvoices.filter(inv => inv.status === "pending").length,
            period: {
                start: start_date || "all time",
                end: end_date || "present"
            }
        })

    } catch (error) {
        console.error("[Admin API] Error calculating revenue:", error)

        return res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to calculate revenue"
        })
    }
}
