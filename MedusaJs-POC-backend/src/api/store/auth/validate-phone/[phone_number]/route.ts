import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import TelecomCoreModuleService from "../../../../modules/telecom-core/service"

/**
 * Validate Phone Number API
 * GET /store/auth/validate-phone/:phone_number
 * 
 * Checks if a phone number is:
 * - Already registered
 * - A Nexel number
 * - Available for registration
 */
export async function GET(
    req: MedusaRequest<{ phone_number: string }>,
    res: MedusaResponse
) {
    const telecomModule: TelecomCoreModuleService = req.scope.resolve("telecom")
    const { phone_number } = req.params

    try {
        // Check if it's a Nexel number
        const nexelNumber = await telecomModule.listMsisdnInventories({
            phone_number
        })
        const isNexelNumber = nexelNumber.length > 0

        // Check if already registered
        const existingProfile = await telecomModule.listCustomerProfiles({
            primary_phone: phone_number
        })
        const isRegistered = existingProfile.length > 0

        return res.json({
            phone_number,
            is_nexel_number: isNexelNumber,
            is_registered: isRegistered,
            can_register: !isNexelNumber && !isRegistered,
            message: isNexelNumber
                ? "This is a Nexel number. Cannot be used for registration."
                : isRegistered
                    ? "This number is already registered."
                    : "This number is available for registration."
        })

    } catch (error) {
        console.error("[Validate Phone] Error:", error)
        return res.status(500).json({
            error: error instanceof Error ? error.message : "Validation failed"
        })
    }
}
