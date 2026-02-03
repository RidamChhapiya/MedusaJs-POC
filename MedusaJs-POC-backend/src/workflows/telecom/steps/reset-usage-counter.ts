import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import TelecomCoreModuleService from "@modules/telecom-core/service"

export type ResetUsageCounterInput = {
    subscription: any
    should_skip?: boolean
}

export type ResetUsageCounterOutput = {
    usage_counter_id?: string
    cycle_month?: string
    skipped: boolean
}

/**
 * Step 4: Reset Usage Counter
 * Creates new usage counter for the next billing cycle
 */
export const resetUsageCounterStep = createStep(
    "reset-usage-counter",
    async (input: ResetUsageCounterInput, { container }) => {
        const telecomService: TelecomCoreModuleService = container.resolve("telecom")

        console.log(`[Reset Usage] Processing for subscription ${input.subscription.id}`)

        // Skip if subscription is suspended
        if (input.should_skip) {
            console.log(`[Reset Usage] ⏭️ Skipping - subscription suspended`)
            return new StepResponse({
                skipped: true
            })
        }

        // Calculate new cycle month
        const now = new Date()
        const cycle_month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`

        console.log(`[Reset Usage] Creating usage counter for cycle: ${cycle_month}`)

        // Check if counter already exists (idempotency)
        const existing = await telecomService.listUsageCounters({
            subscription_id: input.subscription.id,
            cycle_month
        })

        if (existing.length > 0) {
            console.log(`[Reset Usage] ℹ️ Usage counter already exists for this cycle`)
            return new StepResponse({
                usage_counter_id: existing[0].id,
                cycle_month,
                skipped: false
            })
        }

        // Create new usage counter (model: period_month, period_year, data_used_mb, voice_used_min)
        const created = await telecomService.createUsageCounters({
            subscription_id: input.subscription.id,
            period_month: new Date().getMonth() + 1,
            period_year: new Date().getFullYear(),
            data_used_mb: 0,
            voice_used_min: 0
        } as any)
        const usageCounter = Array.isArray(created) ? created[0] : created

        console.log(`[Reset Usage] ✅ Created usage counter: ${usageCounter.id}`)

        return new StepResponse({
            usage_counter_id: usageCounter.id,
            cycle_month,
            skipped: false
        })
    }
)
