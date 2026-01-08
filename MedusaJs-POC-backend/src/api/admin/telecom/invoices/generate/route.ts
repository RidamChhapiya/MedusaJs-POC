import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { generateInvoiceWorkflow } from "../../../../../workflows/billing/generate-invoice"

/**
 * Admin API: Generate Invoice Manually
 * 
 * POST /admin/telecom/invoices/generate
 */
export async function POST(
    req: MedusaRequest,
    res: MedusaResponse
) {
    const { customer_id, subscription_id, line_items, due_days } = req.body as {
        customer_id: string
        subscription_id: string
        line_items: Array<{
            description: string
            amount: number
            quantity?: number
        }>
        due_days?: number
    }

    try {
        console.log(`[Admin API] Generating invoice for subscription: ${subscription_id}`)

        const { result } = await generateInvoiceWorkflow(req.scope).run({
            input: {
                customer_id,
                subscription_id,
                line_items,
                due_days
            }
        })

        return res.json({
            success: true,
            invoice: result.invoice
        })

    } catch (error) {
        console.error("[Admin API] Error generating invoice:", error)

        return res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to generate invoice"
        })
    }
}
