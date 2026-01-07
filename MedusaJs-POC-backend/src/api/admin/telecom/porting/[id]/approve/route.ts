import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import TelecomCoreModuleService from "../../../../../modules/telecom-core/service"

/**
 * Admin API: Approve Porting Request
 * 
 * POST /admin/telecom/porting/:id/approve
 */
export async function POST(
    req: MedusaRequest<{ id: string }>,
    res: MedusaResponse
) {
    const { id } = req.params
    const { scheduled_date } = req.body as { scheduled_date?: string }
    const telecomModule: TelecomCoreModuleService = req.scope.resolve("telecom")

    try {
        const [request] = await telecomModule.listPortingRequests({ id })

        if (!request) {
            return res.status(404).json({
                error: "Porting request not found"
            })
        }

        const updateData: any = {
            status: "approved"
        }

        if (scheduled_date) {
            updateData.scheduled_date = new Date(scheduled_date)
        }

        await telecomModule.updatePortingRequests(id, updateData)

        return res.json({
            success: true,
            message: "Porting request approved",
            scheduled_date: scheduled_date || null
        })

    } catch (error) {
        console.error("[Admin API] Error approving porting request:", error)

        return res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to approve porting request"
        })
    }
}
