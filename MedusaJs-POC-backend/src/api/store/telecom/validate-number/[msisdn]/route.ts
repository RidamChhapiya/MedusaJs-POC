import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import TelecomCoreModuleService from "@modules/telecom-core/service"

/**
 * Store API Route: Validate Phone Number for Recharge
 * 
 * GET /store/telecom/validate-number/:msisdn
 * 
 * Public endpoint to check if a phone number is a customer of our network.
 * Used before recharge to verify the number exists in our system.
 * 
 * Does NOT expose sensitive details like usage, plan details, or billing info.
 */
export async function GET(
    req: MedusaRequest<{ msisdn: string }>,
    res: MedusaResponse
) {
    const { msisdn } = req.params

    try {
        const telecomModule: TelecomCoreModuleService = req.scope.resolve("telecom")

        console.log(`[Number Validation] Checking if ${msisdn} is our customer...`)

        // Search for the number in MSISDN Inventory
        const [msisdnRecord] = await telecomModule.listMsisdnInventories({
            msisdn
        })

        // If not found, number is not our customer
        if (!msisdnRecord) {
            console.log(`[Number Validation] ${msisdn} is not our customer`)
            return res.json({
                valid: false,
                message: "This number is not registered with our network"
            })
        }

        // Check if number has an active subscription
        const subscriptions = await telecomModule.listSubscriptions({
            msisdn_id: msisdnRecord.id
        })

        const hasActiveSubscription = subscriptions.some(
            sub => sub.status === "active" || (sub as any).status === "provisioned"
        )

        if (!hasActiveSubscription) {
            console.log(`[Number Validation] ${msisdn} exists but no active subscription`)
            return res.json({
                valid: false,
                message: "This number is not currently active"
            })
        }

        console.log(`[Number Validation] ${msisdn} is a valid customer - can proceed with recharge`)

        // Return simple validation - number is our customer and can be recharged
        return res.json({
            valid: true,
            message: "Number verified. You can proceed with recharge."
        })

    } catch (error) {
        console.error("[Number Validation] Error:", error)

        return res.status(500).json({
            valid: false,
            error: "Unable to validate number. Please try again."
        })
    }
}
