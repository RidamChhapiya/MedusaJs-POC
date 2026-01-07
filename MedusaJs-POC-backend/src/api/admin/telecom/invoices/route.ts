import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import TelecomCoreModuleService from "../../../../modules/telecom-core/service"

/**
 * Admin API: List Invoices
 * 
 * GET /admin/telecom/invoices
 */
export async function GET(
    req: MedusaRequest,
    res: MedusaResponse
) {
    const telecomModule: TelecomCoreModuleService = req.scope.resolve("telecom")

    const {
        status,
        customer_id,
        subscription_id,
        limit = 20,
        offset = 0
    } = req.query as {
        status?: string
        customer_id?: string
        subscription_id?: string
        limit?: number
        offset?: number
    }

    try {
        const filters: any = {}

        if (status) filters.status = status
        if (customer_id) filters.customer_id = customer_id
        if (subscription_id) filters.subscription_id = subscription_id

        const invoices = await telecomModule.listInvoices(filters)

        return res.json({
            invoices: invoices.slice(offset, offset + limit),
            count: invoices.length,
            limit,
            offset
        })

    } catch (error) {
        console.error("[Admin API] Error listing invoices:", error)

        return res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to list invoices"
        })
    }
}
