import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { changePlanWorkflow } from "../../../../../../workflows/telecom/change-plan"
import TelecomCoreModuleService from "@modules/telecom-core/service"
import { Modules } from "@medusajs/framework/utils"

/**
 * Admin API: Change Subscription Plan
 * 
 * POST /admin/telecom/subscriptions/:id/change-plan
 */
export async function POST(
    req: MedusaRequest<{ id: string }>,
    res: MedusaResponse
) {
    const { id } = req.params
    const body = req.body as any
    const new_plan_config_id = body?.new_plan_config_id as string
    const old_plan_price = body?.old_plan_price as number
    const new_plan_price = body?.new_plan_price as number

    const telecomModule: TelecomCoreModuleService = req.scope.resolve("telecom")

    try {
        console.log(`[Admin API] Changing plan for subscription: ${id}`)

        // Get current plan config ID from metadata
        const [subscription] = await telecomModule.listSubscriptions({ id })

        if (!subscription) {
            return res.status(404).json({
                error: "Subscription not found"
            })
        }

        const oldPlanConfigId = (subscription as any).metadata?.current_plan_config_id || null

        // Execute workflow
        const { result } = await changePlanWorkflow(req.scope).run({
            input: {
                subscription_id: id,
                new_plan_config_id,
                old_plan_price,
                new_plan_price,
                old_plan_config_id: oldPlanConfigId
            }
        })

        return res.json({
            success: true,
            subscription: result.subscription,
            proration: result.proration,
            is_upgrade: result.is_upgrade,
            message: result.is_upgrade ? "Plan upgraded successfully" : "Plan downgraded successfully"
        })

    } catch (error) {
        console.error("[Admin API] Error changing plan:", error)

        return res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to change plan"
        })
    }
}
