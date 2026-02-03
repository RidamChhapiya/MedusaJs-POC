import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import TelecomCoreModuleService from "@modules/telecom-core/service"

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

        // Trim ID to prevent whitespace issues
        const safe_customer_id = customer_id?.trim()

        // Get customer profile
        const profiles = await telecomModule.listCustomerProfiles({
            customer_id: safe_customer_id
        })

        let profile

        if (profiles.length === 0) {
            console.log(`[e-KYC] Creating missing profile for customer ${safe_customer_id}`)

            // Resolve Customer Module to fetch details
            const customerModule = req.scope.resolve("customer")
            const customer = await customerModule.retrieveCustomer(safe_customer_id)

            const fullName = (customer.first_name && customer.last_name)
                ? `${customer.first_name} ${customer.last_name}`
                : (customer.first_name || "Valued Customer")

            const primaryPhone = customer.phone || (customer.metadata?.phone as string) || "N/A"

            // Lazy create profile
            profile = await telecomModule.createCustomerProfiles({
                customer_id: safe_customer_id,
                email: customer.email,
                full_name: fullName,
                primary_phone: primaryPhone,
                address_line1: "", // DB might be NOT NULL, use empty string fallback
                city: "",
                state: "",
                pincode: "",
                kyc_status: "pending",
                kyc_type,
                kyc_number,
                kyc_document_url: document_url || `mock://kyc-${kyc_type}-${Date.now()}.pdf`,
                kyc_verified_at: null,
            })
        } else {
            profile = profiles[0]
            // Update existing with new KYC details
            await telecomModule.updateCustomerProfiles({
                id: profile.id,
                kyc_status: "pending", // Reset to pending
                kyc_type,
                kyc_number,
                kyc_document_url: document_url || `mock://kyc-${kyc_type}-${Date.now()}.pdf`,
            })
        }

        // Mock verification: Auto-approve after 2 seconds
        // We capture the correct ID to update
        const profileId = profile.id

        setTimeout(async () => {
            try {
                await telecomModule.updateCustomerProfiles({
                    id: profileId,
                    kyc_status: "verified",
                    kyc_type,
                    kyc_number,
                    kyc_document_url: document_url || `mock://kyc-${kyc_type}-${Date.now()}.pdf`,
                    kyc_verified_at: new Date(),
                })
                console.log(`[e-KYC] Auto-verified for customer ${safe_customer_id}`)
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

export async function OPTIONS(req: MedusaRequest, res: MedusaResponse) {
    return res.status(200).send()
}
