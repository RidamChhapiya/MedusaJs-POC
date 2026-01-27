import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import TelecomCoreModuleService from "../../../../../modules/telecom-core/service"

/**
 * Admin API: Add Family Member
 * 
 * POST /admin/telecom/family-plans/:id/members
 */
export async function POST(
    req: MedusaRequest<{ id: string }>,
    res: MedusaResponse
) {
    const { id } = req.params
    const { subscription_id } = req.body as { subscription_id: string }
    const telecomModule: TelecomCoreModuleService = req.scope.resolve("telecom")

    try {
        const [familyPlan] = await telecomModule.listFamilyPlans({ id })

        if (!familyPlan) {
            return res.status(404).json({
                error: "Family plan not found"
            })
        }

        if (familyPlan.current_members >= familyPlan.max_members) {
            return res.status(400).json({
                error: `Family plan is full (${familyPlan.max_members} members max)`
            })
        }

        // Add member
        const member = await telecomModule.createFamilyMembers({
            family_plan_id: id,
            subscription_id,
            member_type: "secondary",
            joined_date: new Date(),
            status: "active"
        })

        // Update member count
        await telecomModule.updateFamilyPlans(id, {
            current_members: familyPlan.current_members + 1
        })

        return res.json({
            success: true,
            member,
            message: `Member added. ${familyPlan.current_members + 1}/${familyPlan.max_members} slots used`
        })

    } catch (error) {
        console.error("[Admin API] Error adding family member:", error)

        return res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to add family member"
        })
    }
}

/**
 * Admin API: List Family Members
 * 
 * GET /admin/telecom/family-plans/:id/members
 */
export async function GET(
    req: MedusaRequest<{ id: string }>,
    res: MedusaResponse
) {
    const { id } = req.params
    const telecomModule: TelecomCoreModuleService = req.scope.resolve("telecom")

    try {
        const members = await telecomModule.listFamilyMembers({
            family_plan_id: id,
            status: "active"
        })

        return res.json({
            members,
            count: members.length
        })

    } catch (error) {
        console.error("[Admin API] Error listing family members:", error)

        return res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to list family members"
        })
    }
}
