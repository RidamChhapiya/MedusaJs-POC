import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import TelecomCoreModuleService from "@modules/telecom-core/service"

/**
 * Admin API: Update Plan
 * PATCH /admin/telecom/plans/:id
 */
export async function PATCH(
    req: MedusaRequest<{ id: string }>,
    res: MedusaResponse
) {
    const { id } = req.params
    const telecomModule: TelecomCoreModuleService = req.scope.resolve("telecom")

    try {
        const {
            name,
            description,
            price,
            data_quota_mb,
            voice_quota_min,
            validity_days,
            is_active
        } = req.body as any

        const updateData: any = { id }
        if (name !== undefined) updateData.name = name
        if (description !== undefined) updateData.description = description
        if (price !== undefined) updateData.price = parseInt(price)
        if (data_quota_mb !== undefined) updateData.data_quota_mb = parseInt(data_quota_mb)
        if (voice_quota_min !== undefined) updateData.voice_quota_min = parseInt(voice_quota_min)
        if (validity_days !== undefined) updateData.validity_days = parseInt(validity_days)
        if (is_active !== undefined) updateData.is_active = is_active

        await telecomModule.updatePlanConfigurations(updateData)

        const [updated] = await telecomModule.listPlanConfigurations({ id })

        return res.json({
            plan: updated,
            message: "Plan updated successfully"
        })

    } catch (error) {
        console.error("[Update Plan] Error:", error)
        return res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to update plan"
        })
    }
}

/**
 * Admin API: Delete Plan
 * DELETE /admin/telecom/plans/:id
 */
export async function DELETE(
    req: MedusaRequest<{ id: string }>,
    res: MedusaResponse
) {
    const { id } = req.params
    const telecomModule: TelecomCoreModuleService = req.scope.resolve("telecom")

    try {
        // Check if plan exists
        const [plan] = await telecomModule.listPlanConfigurations({ id })

        if (!plan) {
            return res.status(404).json({
                error: "Plan not found"
            })
        }

        // Check if plan has active subscriptions (optional safety check)
        // const subscriptions = await telecomModule.listSubscriptions({ plan_id: id })
        // if (subscriptions.length > 0) {
        //     return res.status(400).json({
        //         error: "Cannot delete plan with active subscriptions"
        //     })
        // }

        // Actually delete the plan
        await telecomModule.deletePlanConfigurations(id)

        return res.json({
            message: "Plan deleted successfully",
            deleted: true
        })

    } catch (error) {
        console.error("[Delete Plan] Error:", error)
        return res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to delete plan"
        })
    }
}
