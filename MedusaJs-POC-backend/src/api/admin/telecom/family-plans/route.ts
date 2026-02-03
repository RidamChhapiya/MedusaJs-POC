import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import TelecomCoreModuleService from "@modules/telecom-core/service"

/**
 * Admin API: Create Family Plan
 * 
 * POST /admin/telecom/family-plans
 */
export async function POST(
    req: MedusaRequest,
    res: MedusaResponse
) {
    const telecomModule: TelecomCoreModuleService = req.scope.resolve("telecom")

    const {
        primary_subscription_id,
        plan_name,
        total_data_quota_mb,
        total_voice_quota_min,
        max_members = 5
    } = req.body as {
        primary_subscription_id: string
        plan_name: string
        total_data_quota_mb: number
        total_voice_quota_min: number
        max_members?: number
    }

    try {
        console.log(`[Admin API] Creating family plan: ${plan_name}`)

        // Create family plan
        const familyPlan = await telecomModule.createFamilyPlans({
            primary_subscription_id,
            plan_name,
            total_data_quota_mb,
            total_voice_quota_min,
            shared_data_used_mb: 0,
            shared_voice_used_min: 0,
            max_members,
            current_members: 1,
            status: "active"
        })

        // Add primary member
        await telecomModule.createFamilyMembers({
            family_plan_id: familyPlan.id,
            subscription_id: primary_subscription_id,
            member_type: "primary",
            joined_date: new Date(),
            status: "active"
        })

        return res.json({
            success: true,
            family_plan: familyPlan,
            message: `Family plan created with ${max_members} member slots`
        })

    } catch (error) {
        console.error("[Admin API] Error creating family plan:", error)

        return res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to create family plan"
        })
    }
}

/**
 * Admin API: List Family Plans
 * 
 * GET /admin/telecom/family-plans
 */
export async function GET(
    req: MedusaRequest,
    res: MedusaResponse
) {
    const telecomModule: TelecomCoreModuleService = req.scope.resolve("telecom")
    const { primary_subscription_id, status, limit = 20, offset = 0 } = req.query as any

    try {
        const filters: any = {}
        if (primary_subscription_id) filters.primary_subscription_id = primary_subscription_id
        if (status) filters.status = status

        const plans = await telecomModule.listFamilyPlans(filters, {
            take: parseInt(limit),
            skip: parseInt(offset)
        })

        return res.json({
            family_plans: plans,
            count: plans.length,
            limit: parseInt(limit),
            offset: parseInt(offset)
        })

    } catch (error) {
        console.error("[Admin API] Error listing family plans:", error)

        return res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to list family plans"
        })
    }
}
