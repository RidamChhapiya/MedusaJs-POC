import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import TelecomCoreModuleService from "@modules/telecom-core/service"
import { Modules } from "@medusajs/framework/utils"
import { calculateProration } from "../../utils/proration"

/**
 * Step: Validate Plan Change
 */
const validatePlanChangeStep = createStep(
    "validate-plan-change",
    async ({ subscription_id, new_plan_config_id }: any, { container }) => {
        const telecomModule: TelecomCoreModuleService = container.resolve("telecom")

        // Get subscription
        const [subscription] = await telecomModule.listSubscriptions({ id: subscription_id })

        if (!subscription) {
            throw new Error("Subscription not found")
        }

        if (subscription.status !== "active") {
            throw new Error(`Cannot change plan for ${subscription.status} subscription`)
        }

        // Get new plan configuration
        const [newPlanConfig] = await telecomModule.listPlanConfigurations({
            id: new_plan_config_id
        })

        if (!newPlanConfig) {
            throw new Error("New plan configuration not found")
        }

        console.log(`[Plan Change] Validated: ${subscription.id} -> ${newPlanConfig.id}`)

        return new StepResponse({
            subscription,
            new_plan_config: newPlanConfig
        })
    }
)

/**
 * Step: Calculate Prorated Charges
 */
const calculateProratedChargesStep = createStep(
    "calculate-prorated-charges",
    async ({ subscription, new_plan_config, old_plan_price, new_plan_price }: any, { container }) => {
        const proration = calculateProration(
            old_plan_price,
            new_plan_price,
            new Date(subscription.renewal_date)
        )

        console.log(`[Plan Change] Proration calculated:`)
        console.log(`  Credit: ₹${proration.credit_amount / 100}`)
        console.log(`  Charge: ₹${proration.charge_amount / 100}`)
        console.log(`  Net: ₹${proration.net_amount / 100}`)

        return new StepResponse({
            proration,
            is_upgrade: new_plan_price > old_plan_price
        })
    }
)

/**
 * Step: Update Subscription Plan
 */
const updateSubscriptionPlanStep = createStep(
    "update-subscription-plan",
    async ({ subscription_id, new_plan_config_id, old_plan_config_id }: any, { container }) => {
        const telecomModule: TelecomCoreModuleService = container.resolve("telecom")

        // Update subscription metadata to track plan change
        const [subscription] = await telecomModule.listSubscriptions({ id: subscription_id })
        const metadata = (subscription as any).metadata || {}

        const planHistory = metadata.plan_history || []
        planHistory.push({
            from_plan: old_plan_config_id,
            to_plan: new_plan_config_id,
            changed_at: new Date().toISOString()
        })

        const updated = await telecomModule.updateSubscriptions({
            id: subscription_id,
            metadata: {
                ...metadata,
                current_plan_config_id: new_plan_config_id,
                previous_plan_config_id: old_plan_config_id,
                plan_history: planHistory
            }
        } as any)

        console.log(`[Plan Change] Updated subscription metadata`)

        return new StepResponse(updated, {
            subscription_id,
            old_plan_config_id
        })
    },
    async (compensationData, { container }) => {
        // Compensation: Revert plan change
        if (compensationData) {
            const telecomModule: TelecomCoreModuleService = container.resolve("telecom")
            const { subscription_id, old_plan_config_id } = compensationData

            const [subscription] = await telecomModule.listSubscriptions({ id: subscription_id })
            const metadata = (subscription as any).metadata || {}

            await telecomModule.updateSubscriptions({
                id: subscription_id,
                metadata: {
                    ...metadata,
                    current_plan_config_id: old_plan_config_id
                }
            } as any)

            console.log(`[Plan Change] Reverted plan change`)
        }
    }
)

/**
 * Step: Reset Usage Counter
 */
const resetUsageCounterStep = createStep(
    "reset-usage-counter",
    async ({ subscription_id }: any, { container }) => {
        const telecomModule: TelecomCoreModuleService = container.resolve("telecom")

        const now = new Date()
        const currentMonth = now.getMonth() + 1
        const currentYear = now.getFullYear()

        // Get current usage counter
        const usageCounters = await telecomModule.listUsageCounters({
            subscription_id,
            period_month: currentMonth,
            period_year: currentYear
        })

        if (usageCounters.length > 0) {
            await telecomModule.updateUsageCounters({
                id: usageCounters[0].id,
                data_used_mb: 0,
                voice_used_min: 0
            } as any)

            console.log(`[Plan Change] Reset usage counter`)
        }

        return new StepResponse({ success: true })
    }
)

/**
 * Step: Emit Plan Changed Event
 */
const emitPlanChangedEventStep = createStep(
    "emit-plan-changed-event",
    async ({ subscription_id, old_plan_config_id, new_plan_config_id, proration }: any, { container }) => {
        const eventBus = container.resolve(Modules.EVENT_BUS)

        await eventBus.emit("telecom.plan.changed" as any, {
            subscription_id,
            old_plan_config_id,
            new_plan_config_id,
            proration,
            changed_at: new Date()
        })

        console.log(`[Plan Change] Emitted plan.changed event`)

        return new StepResponse({ success: true })
    }
)

/**
 * Workflow: Change Subscription Plan
 */
export const changePlanWorkflow = createWorkflow(
    "change-plan-workflow",
    (input: {
        subscription_id: string
        new_plan_config_id: string
        old_plan_price: number
        new_plan_price: number
        old_plan_config_id: string
    }) => {
        // Step 1: Validate
        const { subscription, new_plan_config } = validatePlanChangeStep({
            subscription_id: input.subscription_id,
            new_plan_config_id: input.new_plan_config_id
        })

        // Step 2: Calculate proration
        const { proration, is_upgrade } = calculateProratedChargesStep({
            subscription,
            new_plan_config,
            old_plan_price: input.old_plan_price,
            new_plan_price: input.new_plan_price
        })

        // Step 3: Update subscription
        const updatedSubscription = updateSubscriptionPlanStep({
            subscription_id: input.subscription_id,
            new_plan_config_id: input.new_plan_config_id,
            old_plan_config_id: input.old_plan_config_id
        })

        // Step 4: Reset usage counter
        resetUsageCounterStep({
            subscription_id: input.subscription_id
        })

        // Step 5: Emit event
        emitPlanChangedEventStep({
            subscription_id: input.subscription_id,
            old_plan_config_id: input.old_plan_config_id,
            new_plan_config_id: input.new_plan_config_id,
            proration
        })

        return new WorkflowResponse({
            subscription: updatedSubscription,
            proration,
            is_upgrade
        })
    }
)
