import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import TelecomCoreModuleService from "@modules/telecom-core/service"

export type InitializeUsageInput = {
    subscriptions: Array<{
        subscription_id: string
        msisdn_id: string
    }>
}

/**
 * Step 5: Initialize Usage Counters
 * Creates usage counter records for the current billing period
 */
export const initializeUsageStep = createStep(
    "initialize-usage",
    async (input: InitializeUsageInput, { container }) => {
        const telecomService: TelecomCoreModuleService = container.resolve("telecom")

        const now = new Date()
        // Format: 'YYYY-MM'
        const cycleMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`

        for (const subscription of input.subscriptions) {
            const periodMonth = now.getMonth() + 1
            const periodYear = now.getFullYear()
            const existingCounters = await telecomService.listUsageCounters({
                subscription_id: subscription.subscription_id,
                period_month: periodMonth,
                period_year: periodYear,
            })

            if (existingCounters && existingCounters.length > 0) {
                console.log(
                    `[Initialize Usage] Usage counter already exists for subscription ${subscription.subscription_id}, skipping`
                )
                continue
            }

            await telecomService.createUsageCounters({
                subscription_id: subscription.subscription_id,
                period_month: periodMonth,
                period_year: periodYear,
                data_used_mb: 0,
                voice_used_min: 0,
            })

            console.log(
                `[Initialize Usage] Created usage counter for subscription ${subscription.subscription_id} (cycle: ${cycleMonth})`
            )
        }

        return new StepResponse({
            initialized_count: input.subscriptions.length,
            cycle_month: cycleMonth,
        })
    }
)
