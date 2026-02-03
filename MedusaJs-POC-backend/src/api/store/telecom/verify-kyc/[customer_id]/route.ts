import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import TelecomCoreModuleService from "@modules/telecom-core/service"

/**
 * Check e-KYC Status
 * GET /store/telecom/verify-kyc/:customer_id
 */
export async function GET(
    req: MedusaRequest,
    res: MedusaResponse
) {
    const telecomModule: TelecomCoreModuleService = req.scope.resolve("telecom")
    const { customer_id } = req.params
    const safe_customer_id = customer_id?.trim()

    try {
        const profiles = await telecomModule.listCustomerProfiles({
            customer_id: safe_customer_id
        })

        if (profiles.length === 0) {
            // Return 'none' status instead of 404 to handle missing profiles gracefully
            return res.json({
                customer_id,
                kyc_status: "none",
                kyc_type: null,
                kyc_verified_at: null,
            })
        }

        const profile = profiles[0]

        return res.json({
            customer_id: safe_customer_id,
            kyc_status: profile.kyc_status,
            kyc_type: profile.kyc_type,
            kyc_verified_at: profile.kyc_verified_at,
        })

    } catch (error) {
        console.error("[e-KYC Status] Error:", error)
        return res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to fetch KYC status"
        })
    }
}

export async function OPTIONS(req: MedusaRequest, res: MedusaResponse) {
    return res.status(200).send()
}
