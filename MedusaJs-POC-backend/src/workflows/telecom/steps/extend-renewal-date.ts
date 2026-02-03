import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import TelecomCoreModuleService from "@modules/telecom-core/service"

export type ExtendRenewalDateInput = {
    subscription: any
    plan_config: any
    should_suspend?: boolean
}

export type ExtendRenewalDateOutput = {
    new_renewal_date: Date
    new_status: string
}

/**
 * Step 3: Extend Renewal Date
 * Updates subscription renewal date and status
 */
export const extendRenewalDateStep = createStep(
    "extend-renewal-date",
    async (input: ExtendRenewalDateInput, { container }) => {
        const telecomService: TelecomCoreModuleService = container.resolve("telecom")

        console.log(`[Extend Renewal] Processing for subscription ${input.subscription.id}`)

        let new_status = input.subscription.status
        let new_renewal_date = new Date(input.subscription.renewal_date)

        if (input.should_suspend) {
            // Suspend the subscription
            new_status = "suspended"
            console.log(`[Extend Renewal] ⚠️ Suspending subscription due to failed payment`)
        } else {
            // Extend renewal date by contract months
            new_renewal_date = new Date(input.subscription.renewal_date)
            new_renewal_date.setMonth(new_renewal_date.getMonth() + input.plan_config.contract_months)

            console.log(`[Extend Renewal] ✅ Extending renewal date`)
            console.log(`   Old date: ${input.subscription.renewal_date}`)
            console.log(`   New date: ${new_renewal_date}`)
        }

        // Update subscription (model may not have renewal_date; use as any)
        await telecomService.updateSubscriptions({
            id: input.subscription.id,
            status: new_status,
            ...({ renewal_date: new_renewal_date } as any)
        } as any)

        console.log(`[Extend Renewal] Updated subscription status: ${new_status}`)

        return new StepResponse({
            new_renewal_date,
            new_status
        })
    }
)
