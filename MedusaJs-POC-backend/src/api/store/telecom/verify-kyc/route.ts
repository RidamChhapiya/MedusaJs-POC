import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import TelecomCoreModuleService from "../../../../modules/telecom-core/service"

/**
 * e-KYC Verification API (Mock for POC)
 * POST /store/telecom/verify-kyc
 * 
 * Simulates e-KYC verification process
 * In production, this would integrate with DigiLocker/UIDAI
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
    const telecomModule: TelecomCoreModuleService = req.scope.resolve("telecom")

    try {
        const {
            customer_id,
            kyc_type,
            kyc_number,
            document_url
        } = req.body as any

        // Get customer profile
        const profiles = await telecomModule.listCustomerProfiles({
            customer_id
        })

        if (profiles.length === 0) {
            return res.status(404).json({
                error: "Customer not found"
            })
        }

        const profile = profiles[0]

        // Mock verification: Auto-approve after 2 seconds
        setTimeout(async () => {
            try {
                await telecomModule.updateCustomerProfiles({
                    id: profile.id,
                    kyc_status: "verified",
                    kyc_type,
                    kyc_number,
                    kyc_document_url: document_url || `mock://kyc-${kyc_type}-${Date.now()}.pdf`,
                    kyc_verified_at: new Date(),
                })
                console.log(`[e-KYC] Auto-verified for customer ${customer_id}`)
            } catch (error) {
                console.error("[e-KYC] Auto-verification failed:", error)
            }
        }, 2000)

        return res.status(200).json({
            success: true,
            message: "e-KYC verification initiated. This usually takes 2-3 seconds.",
            kyc_status: "pending",
            estimated_completion: "2 seconds"
        })

    } catch (error) {
        console.error("[e-KYC Verification] Error:", error)
        return res.status(500).json({
            error: error instanceof Error ? error.message : "e-KYC verification failed"
        })
    }
}

/**
 * Check e-KYC Status
 * GET /store/telecom/verify-kyc/:customer_id
 */
export async function GET(
    req: MedusaRequest<{ customer_id: string }>,
    res: MedusaResponse
) {
    const telecomModule: TelecomCoreModuleService = req.scope.resolve("telecom")
    const { customer_id } = req.params

    try {
        const profiles = await telecomModule.listCustomerProfiles({
            customer_id
        })

        if (profiles.length === 0) {
            return res.status(404).json({
                error: "Customer not found"
            })
        }

        const profile = profiles[0]

        return res.json({
            customer_id,
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
