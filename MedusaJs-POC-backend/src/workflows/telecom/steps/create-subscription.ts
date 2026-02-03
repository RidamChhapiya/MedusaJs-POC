import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import TelecomCoreModuleService from "@modules/telecom-core/service"

export type CreateSubscriptionInput = {
    customer_id: string
    validated_items: Array<{
        line_item_id: string
        msisdn_id: string
        phone_number: string
    }>
    plan_items: Array<{
        line_item_id: string
        plan_config?: {
            type: string
            contract_months: number
        }
    }>
}

export type CreateSubscriptionOutput = {
    subscriptions: Array<{
        subscription_id: string
        line_item_id: string
        msisdn_id: string
    }>
}

/**
 * Step 3: Create Subscriptions
 * Creates subscription records for each plan item
 * Includes idempotency check to prevent duplicates
 */
export const createSubscriptionStep = createStep(
    "create-subscription",
    async (input: CreateSubscriptionInput, { container }) => {
        const telecomService: TelecomCoreModuleService = container.resolve("telecom")

        const subscriptions: { subscription_id: string; line_item_id: string; msisdn_id: string }[] = []
        const now = new Date()

        for (const validatedItem of input.validated_items) {
            const planItem = input.plan_items.find(
                (p) => p.line_item_id === validatedItem.line_item_id
            )

            if (!planItem) {
                continue
            }

            // Idempotency: subscription has msisdn = phone number
            const existingSubscriptions = await telecomService.listSubscriptions({
                msisdn: validatedItem.phone_number,
            })

            if (existingSubscriptions && existingSubscriptions.length > 0) {
                console.log(
                    `[Create Subscription] Subscription already exists for MSISDN ${validatedItem.phone_number}, skipping`
                )
                subscriptions.push({
                    subscription_id: existingSubscriptions[0].id,
                    line_item_id: validatedItem.line_item_id,
                    msisdn_id: validatedItem.msisdn_id,
                })
                continue
            }

            const contractMonths = planItem.plan_config?.contract_months || 1
            const endDate = new Date(now)
            endDate.setMonth(endDate.getMonth() + contractMonths)

            // Create subscription (model: customer_id, plan_id, msisdn, status, start_date, end_date, data_balance_mb, voice_balance_min, auto_renew)
            const newSubscription = await telecomService.createSubscriptions({
                customer_id: input.customer_id,
                plan_id: (planItem as any).plan_id ?? "",
                msisdn: validatedItem.phone_number,
                status: "active",
                start_date: now,
                end_date: endDate,
                data_balance_mb: 0,
                voice_balance_min: 0,
                auto_renew: false,
            } as any)

            const sub = Array.isArray(newSubscription) ? newSubscription[0] : newSubscription
            subscriptions.push({
                subscription_id: sub.id,
                line_item_id: validatedItem.line_item_id,
                msisdn_id: validatedItem.msisdn_id,
            })

            console.log(
                `[Create Subscription] Created subscription ${sub.id} for phone ${validatedItem.phone_number}`
            )
        }

        return new StepResponse({
            subscriptions,
        })
    }
)
