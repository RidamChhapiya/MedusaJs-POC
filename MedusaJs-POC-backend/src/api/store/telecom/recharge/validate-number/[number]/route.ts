import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import TelecomCoreModuleService from "../../../../../modules/telecom-core/service"

/**
 * Check if a number is an active Nexel number (same logic as recharge step 1).
 * GET /store/telecom/recharge/validate-number/:number
 *
 * Use this before showing plan selection so the user gets immediate feedback.
 */
export async function GET(
    req: MedusaRequest<{ number: string }>,
    res: MedusaResponse
) {
    const number = req.params.number?.trim()

    if (!number || number.length < 5) {
        return res.status(400).json({
            valid: false,
            message: "Please enter a valid phone number.",
        })
    }

    try {
        const telecomModule: TelecomCoreModuleService = req.scope.resolve("telecom")

        const msisdns = await telecomModule.listMsisdnInventories({
            phone_number: number,
            status: "active",
        })

        if (msisdns.length === 0) {
            return res.json({
                valid: false,
                message: "This number is not an active Nexel number. Only existing Nexel numbers can be recharged.",
            })
        }

        const msisdn = msisdns[0]
        if (!msisdn.customer_id) {
            return res.json({
                valid: false,
                message: "This number is not assigned to a customer and cannot be recharged.",
            })
        }

        return res.json({
            valid: true,
            message: "Number verified. You can proceed to select a plan.",
        })
    } catch (error) {
        console.error("[Recharge validate-number] Error:", error)
        return res.status(500).json({
            valid: false,
            message: "Unable to check number. Please try again.",
        })
    }
}
