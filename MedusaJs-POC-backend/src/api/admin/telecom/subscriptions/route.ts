import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import TelecomCoreModuleService from "@modules/telecom-core/service"

/**
 * Admin API: List Subscriptions
 * 
 * GET /admin/telecom/subscriptions
 * 
 * Lists all subscriptions with filtering and pagination
 */
export async function GET(
    req: MedusaRequest,
    res: MedusaResponse
) {
    const telecomModule: TelecomCoreModuleService = req.scope.resolve("telecom")

    const {
        status,
        customer_id,
        msisdn,
        limit = 20,
        offset = 0
    } = req.query as {
        status?: string
        customer_id?: string
        msisdn?: string
        limit?: number
        offset?: number
    }

    try {
        console.log(`[Admin API] Listing subscriptions with filters:`, { status, customer_id, msisdn })

        // Build filter object
        const filters: any = {}

        if (status) filters.status = status
        if (customer_id) filters.customer_id = customer_id

        // If MSISDN filter provided, filter by phone number (subscription.msisdn)
        if (msisdn) {
            filters.msisdn = msisdn
        }

        // Get subscriptions
        const subscriptions = await telecomModule.listSubscriptions(filters)

        console.log(`[Admin API] Found ${subscriptions.length} subscriptions`)

        // Get MSISDN details for each subscription (subscription has msisdn = phone number)
        const enrichedSubscriptions = await Promise.all(
            subscriptions.map(async (sub) => {
                let msisdnDetails: { id: string; msisdn: string } | null = null
                if (sub.msisdn) {
                    const [inv] = await telecomModule.listMsisdnInventories({ phone_number: sub.msisdn })
                    msisdnDetails = inv ? { id: inv.id, msisdn: inv.phone_number } : null
                }

                return {
                    ...sub,
                    msisdn: msisdnDetails
                }
            })
        )

        return res.json({
            subscriptions: enrichedSubscriptions.slice(offset, offset + limit),
            count: enrichedSubscriptions.length,
            limit,
            offset
        })

    } catch (error) {
        console.error("[Admin API] Error listing subscriptions:", error)

        return res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to list subscriptions"
        })
    }
}
