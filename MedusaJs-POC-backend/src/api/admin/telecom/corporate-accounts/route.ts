import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import TelecomCoreModuleService from "@modules/telecom-core/service"

/**
 * Admin API: Create Corporate Account
 * POST /admin/telecom/corporate-accounts
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
    const telecomModule: TelecomCoreModuleService = req.scope.resolve("telecom")

    const {
        company_name,
        billing_contact_id,
        bulk_discount_percentage = 0,
        payment_terms = "net-30"
    } = req.body as any

    try {
        const account = await telecomModule.createCorporateAccounts({
            company_name,
            billing_contact_id,
            total_subscriptions: 0,
            bulk_discount_percentage,
            centralized_billing: true,
            payment_terms,
            status: "active"
        })

        return res.json({
            success: true,
            corporate_account: account,
            message: `Corporate account created with ${bulk_discount_percentage}% bulk discount`
        })
    } catch (error) {
        return res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to create corporate account"
        })
    }
}

/**
 * Admin API: List Corporate Accounts
 * GET /admin/telecom/corporate-accounts
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const telecomModule: TelecomCoreModuleService = req.scope.resolve("telecom")
    const { status, limit = 20, offset = 0 } = req.query as any

    try {
        const filters: any = {}
        if (status) filters.status = status

        const accounts = await telecomModule.listCorporateAccounts(filters, {
            take: parseInt(limit),
            skip: parseInt(offset)
        })

        return res.json({
            corporate_accounts: accounts,
            count: accounts.length
        })
    } catch (error) {
        return res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to list corporate accounts"
        })
    }
}
