import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import TelecomCoreModuleService from "../../../../modules/telecom-core/service"

/**
 * Admin API: Plan Catalog Management
 * GET /admin/telecom/plans
 * 
 * Provides complete plan catalog with performance metrics
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const telecomModule: TelecomCoreModuleService = req.scope.resolve("telecom")

    try {
        // Get all plans
        const plans = await telecomModule.listPlanConfigurations({})

        // Enrich with performance metrics
        const enrichedPlans = await Promise.all(
            plans.map(async (plan) => {
                // NOTE: Subscription model doesn't have plan_id field yet
                // So we can't filter subscriptions by plan
                // For now, show 0 subscribers until plan_id is added to Subscription model
                const activeSubscribers = 0

                // Calculate revenue (would need to link invoices to plans)
                const invoices = await telecomModule.listInvoices({})
                const planRevenue = invoices
                    .filter(inv => inv.status === "paid")
                    .reduce((sum, inv) => sum + inv.total_amount, 0)

                return {
                    id: plan.id,
                    name: plan.name,
                    description: plan.description,
                    price: plan.price,
                    data_quota_mb: plan.data_quota_mb,
                    voice_quota_min: plan.voice_quota_min,
                    validity_days: plan.validity_days,
                    is_active: plan.is_active,
                    created_at: plan.created_at,
                    updated_at: plan.updated_at,
                    metrics: {
                        active_subscribers: activeSubscribers,
                        total_revenue: planRevenue,
                        avg_revenue_per_user: activeSubscribers > 0
                            ? Math.round(planRevenue / activeSubscribers)
                            : 0
                    }
                }
            })
        )

        // Calculate summary
        const summary = {
            total_plans: plans.length,
            active_plans: plans.filter(p => p.is_active).length,
            inactive_plans: plans.filter(p => !p.is_active).length,
            total_subscribers: enrichedPlans.reduce((sum, p) => sum + p.metrics.active_subscribers, 0),
            total_revenue: enrichedPlans.reduce((sum, p) => sum + p.metrics.total_revenue, 0)
        }

        return res.json({
            plans: enrichedPlans,
            summary
        })

    } catch (error) {
        console.error("[Plan Catalog] Error:", error)
        return res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to fetch plan catalog"
        })
    }
}

/**
 * Admin API: Create New Plan
 * POST /admin/telecom/plans
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
    const telecomModule: TelecomCoreModuleService = req.scope.resolve("telecom")

    try {
        const {
            name,
            description,
            price,
            data_quota_mb,
            voice_quota_min,
            validity_days,
            is_active = true
        } = req.body as any

        // Validation
        if (!name || !price || !data_quota_mb || !voice_quota_min || !validity_days) {
            return res.status(400).json({
                error: "Missing required fields: name, price, data_quota_mb, voice_quota_min, validity_days"
            })
        }

        const newPlan = await telecomModule.createPlanConfigurations({
            name,
            description: description || "",
            price: parseInt(price),
            data_quota_mb: parseInt(data_quota_mb),
            voice_quota_min: parseInt(voice_quota_min),
            validity_days: parseInt(validity_days),
            is_active
        })

        // Sync to Medusa Products using workflow
        try {
            const { createProductsWorkflow } = await import("@medusajs/core-flows")

            // Create product using workflow (Medusa v2 recommended approach)
            const { result } = await createProductsWorkflow(req.scope).run({
                input: {
                    products: [
                        {
                            title: name,
                            description: description || "",
                            status: is_active ? "published" : "draft",
                            metadata: {
                                telecom_type: "plan",
                                plan_id: newPlan.id,
                                sync_enabled: true,
                                data_quota_gb: (data_quota_mb / 1024).toFixed(2),
                                voice_quota: voice_quota_min >= 999999 ? "Unlimited" : `${voice_quota_min} min`,
                                validity_days: validity_days
                            },
                            options: [
                                {
                                    title: "Plan Type",
                                    values: ["Prepaid"]
                                }
                            ],
                            variants: [
                                {
                                    title: "Default",
                                    sku: `PLAN-${newPlan.id}`,
                                    manage_inventory: false,
                                    prices: [
                                        {
                                            amount: parseInt(price),
                                            currency_code: "inr"
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            })

            const product = result[0]

            // Update plan with product_id
            await telecomModule.updatePlanConfigurations({
                id: newPlan.id,
                product_id: product.id
            })

            console.log(`[Plan-Product Sync] Created product ${product.id} for plan ${newPlan.id}`)

        } catch (syncError) {
            console.error("[Plan-Product Sync] Failed to sync to products:", syncError)
            // Don't fail the plan creation if product sync fails
        }

        return res.json({
            plan: newPlan,
            message: "Plan created successfully and synced to products"
        })

    } catch (error) {
        console.error("[Create Plan] Error:", error)
        return res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to create plan"
        })
    }
}
