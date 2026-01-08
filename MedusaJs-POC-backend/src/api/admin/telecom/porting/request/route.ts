import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import TelecomCoreModuleService from "../../../../modules/telecom-core/service"

/**
 * Admin API: Create Porting Request
 * 
 * POST /admin/telecom/porting/request
 */
export async function POST(
    req: MedusaRequest,
    res: MedusaResponse
) {
    const telecomModule: TelecomCoreModuleService = req.scope.resolve("telecom")

    const {
        customer_id,
        msisdn,
        donor_operator,
        port_type = "port-in"
    } = req.body as {
        customer_id: string
        msisdn: string
        donor_operator: string
        port_type?: string
    }

    try {
        console.log(`[Admin API] Creating ${port_type} request for ${msisdn}`)

        const portingRequest = await telecomModule.createPortingRequests({
            customer_id,
            msisdn,
            donor_operator,
            port_type,
            status: "pending",
            requested_date: new Date()
        })

        return res.json({
            success: true,
            porting_request: portingRequest,
            message: `Porting request created. Status: pending`
        })

    } catch (error) {
        console.error("[Admin API] Error creating porting request:", error)

        return res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to create porting request"
        })
    }
}

/**
 * Admin API: List Porting Requests
 * 
 * GET /admin/telecom/porting/request
 */
export async function GET(
    req: MedusaRequest,
    res: MedusaResponse
) {
    const telecomModule: TelecomCoreModuleService = req.scope.resolve("telecom")
    const { customer_id, status, port_type, limit = 20, offset = 0 } = req.query as any

    try {
        const filters: any = {}
        if (customer_id) filters.customer_id = customer_id
        if (status) filters.status = status
        if (port_type) filters.port_type = port_type

        const requests = await telecomModule.listPortingRequests(filters, {
            take: parseInt(limit),
            skip: parseInt(offset)
        })

        return res.json({
            porting_requests: requests,
            count: requests.length,
            limit: parseInt(limit),
            offset: parseInt(offset)
        })

    } catch (error) {
        console.error("[Admin API] Error listing porting requests:", error)

        return res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to list porting requests"
        })
    }
}
