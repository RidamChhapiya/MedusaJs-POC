import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import TelecomCoreModuleService from "../../../../../modules/telecom-core/service"

/**
 * Admin API: Get Invoice Details
 * 
 * GET /admin/telecom/invoices/:id
 */
export async function GET(
    req: MedusaRequest<{ id: string }>,
    res: MedusaResponse
) {
    const { id } = req.params
    const telecomModule: TelecomCoreModuleService = req.scope.resolve("telecom")

    try {
        const [invoice] = await telecomModule.listInvoices({ id })

        if (!invoice) {
            return res.status(404).json({
                error: "Invoice not found"
            })
        }

        return res.json({ invoice })

    } catch (error) {
        console.error("[Admin API] Error fetching invoice:", error)

        return res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to fetch invoice"
        })
    }
}
