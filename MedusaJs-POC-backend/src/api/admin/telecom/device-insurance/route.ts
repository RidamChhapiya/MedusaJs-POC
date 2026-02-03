import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import TelecomCoreModuleService from "@modules/telecom-core/service"

/**
 * Admin API: Create Device Insurance
 * POST /admin/telecom/device-insurance
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
    const telecomModule: TelecomCoreModuleService = req.scope.resolve("telecom")

    const {
        subscription_id,
        device_product_id,
        coverage_type,
        monthly_premium,
        claim_limit,
        duration_months = 12
    } = req.body as any

    try {
        const startDate = new Date()
        const endDate = new Date(startDate)
        endDate.setMonth(endDate.getMonth() + duration_months)

        const insurance = await telecomModule.createDeviceInsurances({
            subscription_id,
            device_product_id,
            coverage_type,
            monthly_premium,
            claim_limit,
            start_date: startDate,
            end_date: endDate,
            claims_made: 0,
            status: "active"
        })

        return res.json({
            success: true,
            device_insurance: insurance,
            message: `Insurance activated with ${coverage_type} coverage until ${endDate.toDateString()}`
        })
    } catch (error) {
        return res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to create device insurance"
        })
    }
}

/**
 * Admin API: List Device Insurance Policies
 * GET /admin/telecom/device-insurance
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const telecomModule: TelecomCoreModuleService = req.scope.resolve("telecom")
    const { subscription_id, status } = req.query as any

    try {
        const filters: any = {}
        if (subscription_id) filters.subscription_id = subscription_id
        if (status) filters.status = status

        const policies = await telecomModule.listDeviceInsurances(filters)

        return res.json({
            device_insurance_policies: policies,
            count: policies.length
        })
    } catch (error) {
        return res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to list device insurance"
        })
    }
}
