import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import TelecomCoreModuleService from "@modules/telecom-core/service"

export type FetchSubscriptionDetailsInput = {
    subscription_id: string
}

export type FetchSubscriptionDetailsOutput = {
    subscription: any
    msisdn: any
    plan_config: {
        type: string
        data_quota_mb: number
        voice_quota_min: number
        contract_months: number
        is_5g: boolean
    }
}

/**
 * Step 1: Fetch Subscription Details
 * Retrieves subscription, MSISDN, and plan configuration
 */
export const fetchSubscriptionDetailsStep = createStep(
    "fetch-subscription-details",
    async (input: FetchSubscriptionDetailsInput, { container }) => {
        const telecomService: TelecomCoreModuleService = container.resolve("telecom")
        const query = container.resolve(ContainerRegistrationKeys.QUERY)

        console.log(`[Fetch Details] Fetching subscription ${input.subscription_id}`)

        // Fetch subscription
        const subscriptions = await telecomService.listSubscriptions({
            id: input.subscription_id
        })

        if (subscriptions.length === 0) {
            throw new Error(`Subscription ${input.subscription_id} not found`)
        }

        const subscription = subscriptions[0]
        console.log(`[Fetch Details] Found subscription for customer ${subscription.customer_id}`)

        // Fetch MSISDN (subscription has msisdn = phone number)
        const msisdns = await telecomService.listMsisdnInventories({
            phone_number: subscription.msisdn
        })

        if (msisdns.length === 0) {
            throw new Error(`MSISDN ${subscription.msisdn} not found`)
        }

        const msisdn = msisdns[0]
        console.log(`[Fetch Details] Phone number: ${msisdn.phone_number}`)

        // For now, use hardcoded plan config since we simplified the workflow
        // In production, this would come from the linked PlanConfiguration
        const plan_config = {
            type: "prepaid", // or "postpaid"
            data_quota_mb: 42000,
            voice_quota_min: 999999,
            contract_months: 1,
            is_5g: true
        }

        console.log(`[Fetch Details] Plan type: ${plan_config.type}`)

        return new StepResponse({
            subscription,
            msisdn,
            plan_config
        })
    }
)
