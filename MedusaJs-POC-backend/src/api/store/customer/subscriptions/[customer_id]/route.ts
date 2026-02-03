import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import TelecomCoreModuleService from "@modules/telecom-core/service"

/**
 * Subscription Management API
 * GET /store/customer/subscriptions/:customer_id
 * PATCH /store/customer/subscriptions/:subscription_id
 * 
 * Manage subscription settings:
 * - Toggle auto-renew
 * - Update notification preferences
 * - Suspend/resume subscription
 */

export async function GET(
    req: MedusaRequest<{ customer_id: string }>,
    res: MedusaResponse
) {
    const telecomModule: TelecomCoreModuleService = req.scope.resolve("telecom")
    const { customer_id } = req.params

    try {
        const subscriptions = await telecomModule.listSubscriptions({
            customer_id
        })

        const enrichedSubscriptions = await Promise.all(
            subscriptions.map(async (sub) => {
                const plans = await telecomModule.listPlanConfigurations({
                    id: sub.plan_id
                })
                const plan = plans[0]

                return {
                    id: sub.id,
                    msisdn: sub.msisdn,
                    plan_name: plan?.name || "Unknown",
                    status: sub.status,
                    auto_renew: sub.auto_renew,
                    start_date: sub.start_date,
                    end_date: sub.end_date,
                    can_suspend: sub.status === "active",
                    can_resume: sub.status === "suspended",
                    can_cancel: ["active", "suspended"].includes(sub.status),
                    // Balance and plan quotas for "My numbers" / usage display
                    data_balance_mb: sub.data_balance_mb ?? 0,
                    voice_balance_min: sub.voice_balance_min ?? 0,
                    data_quota_mb: plan?.data_quota_mb ?? 0,
                    voice_quota_min: plan?.voice_quota_min ?? 0,
                    validity_days: plan?.validity_days ?? 0,
                }
            })
        )

        return res.json({
            subscriptions: enrichedSubscriptions
        })

    } catch (error) {
        console.error("[Get Subscriptions] Error:", error)
        return res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to fetch subscriptions"
        })
    }
}

export async function PATCH(
    req: MedusaRequest<{ subscription_id: string }>,
    res: MedusaResponse
) {
    const telecomModule: TelecomCoreModuleService = req.scope.resolve("telecom")
    const { subscription_id } = req.params
    const { action, auto_renew } = req.body as any

    try {
        const subscriptions = await telecomModule.listSubscriptions({
            id: subscription_id
        })

        if (subscriptions.length === 0) {
            return res.status(404).json({
                error: "Subscription not found"
            })
        }

        const subscription = subscriptions[0]

        // Handle different actions
        if (action === "suspend" && subscription.status === "active") {
            await telecomModule.updateSubscriptions({
                id: subscription_id,
                status: "suspended"
            })
            return res.json({
                success: true,
                message: "Subscription suspended successfully"
            })
        }

        if (action === "resume" && subscription.status === "suspended") {
            await telecomModule.updateSubscriptions({
                id: subscription_id,
                status: "active"
            })
            return res.json({
                success: true,
                message: "Subscription resumed successfully"
            })
        }

        if (action === "cancel") {
            await telecomModule.updateSubscriptions({
                id: subscription_id,
                status: "cancelled"
            })
            return res.json({
                success: true,
                message: "Subscription cancelled successfully"
            })
        }

        if (auto_renew !== undefined) {
            await telecomModule.updateSubscriptions({
                id: subscription_id,
                auto_renew
            })
            return res.json({
                success: true,
                message: `Auto-renew ${auto_renew ? 'enabled' : 'disabled'} successfully`
            })
        }

        return res.status(400).json({
            error: "Invalid action or parameters"
        })

    } catch (error) {
        console.error("[Update Subscription] Error:", error)
        return res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to update subscription"
        })
    }
}
