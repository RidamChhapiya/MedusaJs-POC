import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import TelecomCoreModuleService from "../../../../modules/telecom-core/service"

/**
 * Recharge API
 * POST /store/telecom/recharge
 * 
 * Allows anyone to recharge any Nexel number
 * Validates Nexel number exists and is active
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
    const telecomModule: TelecomCoreModuleService = req.scope.resolve("telecom")

    try {
        const {
            nexel_number,
            plan_id,
            payment_method = "card",
            recharge_for_self = false
        } = req.body as any

        // Step 1: Verify Nexel number exists and is active
        const msisdns = await telecomModule.listMsisdnInventories({
            phone_number: nexel_number,
            status: "active"
        })

        if (msisdns.length === 0) {
            return res.status(404).json({
                error: "Nexel number not found",
                message: `The number ${nexel_number} is not an active Nexel number.`
            })
        }

        const msisdn = msisdns[0]

        // Step 2: Get customer who owns this number
        if (!msisdn.customer_id) {
            return res.status(400).json({
                error: "Number not assigned",
                message: "This Nexel number is not assigned to any customer."
            })
        }

        // Step 3: Validate plan exists
        const plans = await telecomModule.listPlanConfigurations({
            id: plan_id,
            is_active: true
        })

        if (plans.length === 0) {
            return res.status(404).json({
                error: "Plan not found or inactive"
            })
        }

        const plan = plans[0]

        // Step 4: Get existing subscription for this MSISDN
        const existingSubscriptions = await telecomModule.listSubscriptions({
            customer_id: msisdn.customer_id,
            msisdn: nexel_number,
            status: "active"
        })

        let subscription

        if (existingSubscriptions.length > 0) {
            // Extend existing subscription
            subscription = existingSubscriptions[0]

            const currentEndDate = new Date(subscription.end_date)
            const newEndDate = new Date(currentEndDate.getTime() + plan.validity_days * 24 * 60 * 60 * 1000)

            await telecomModule.updateSubscriptions({
                id: subscription.id,
                end_date: newEndDate,
                data_balance_mb: subscription.data_balance_mb + plan.data_quota_mb,
                voice_balance_min: subscription.voice_balance_min + plan.voice_quota_min,
            })

            // Update usage counter
            const counters = await telecomModule.listUsageCounters({
                subscription_id: subscription.id
            })

            if (counters.length > 0) {
                await telecomModule.updateUsageCounters({
                    id: counters[0].id,
                    billing_period_end: newEndDate,
                    data_quota_mb: counters[0].data_quota_mb + plan.data_quota_mb,
                    voice_quota_min: counters[0].voice_quota_min + plan.voice_quota_min,
                })
            }

        } else {
            // Create new subscription
            subscription = await telecomModule.createSubscriptions({
                customer_id: msisdn.customer_id,
                plan_id: plan.id,
                msisdn: nexel_number,
                status: "active",
                start_date: new Date(),
                end_date: new Date(Date.now() + plan.validity_days * 24 * 60 * 60 * 1000),
                data_balance_mb: plan.data_quota_mb,
                voice_balance_min: plan.voice_quota_min,
                auto_renew: false,
            })

            // Create usage counter
            await telecomModule.createUsageCounters({
                subscription_id: subscription.id,
                billing_period_start: new Date(),
                billing_period_end: new Date(Date.now() + plan.validity_days * 24 * 60 * 60 * 1000),
                data_used_mb: 0,
                voice_used_min: 0,
                data_quota_mb: plan.data_quota_mb,
                voice_quota_min: plan.voice_quota_min,
            })
        }

        // Step 5: Create invoice
        const now = new Date()
        const invoice = await telecomModule.createInvoices({
            customer_id: msisdn.customer_id,
            subscription_id: subscription.id,
            invoice_number: `RECH-${Date.now()}`,
            subtotal: plan.price, // Required field
            tax_amount: 0, // No tax for recharge
            total_amount: plan.price,
            issue_date: now, // Required field
            due_date: now,
            status: "paid", // Mock: auto-paid
            paid_date: now, // Set paid_date since status is "paid"
            line_items: [{ // Required field
                description: `Recharge: ${plan.name}${plan.validity_days ? ` - ${plan.validity_days} days` : ''}`,
                quantity: 1,
                unit_price: plan.price,
                amount: plan.price
            }]
        })

        // Step 6: Create Medusa Order for tracking (digital delivery)
        let order = null
        try {
            const { createOrderWorkflow } = await import("@medusajs/core-flows")

            if (plan.product_id) {
                const productModule = req.scope.resolve("product")
                const product = await productModule.retrieve(plan.product_id, {
                    relations: ["variants"]
                })

                const variant = product.variants?.[0]

                if (variant) {
                    const { result: orderResult } = await createOrderWorkflow(req.scope).run({
                        input: {
                            customer_id: msisdn.customer_id,
                            region_id: "reg_01HQZV3XFQZQZ0Z0Z0Z0Z0Z0Z0", // TODO: Get from config
                            currency_code: "inr",
                            items: [
                                {
                                    variant_id: variant.id,
                                    quantity: 1,
                                    metadata: {
                                        subscription_id: subscription.id,
                                        msisdn: nexel_number,
                                        item_type: "recharge"
                                    }
                                }
                            ],
                            metadata: {
                                order_type: "recharge",
                                subscription_id: subscription.id,
                                msisdn: nexel_number,
                                requires_fulfillment: false, // Digital only
                                invoice_id: invoice.id
                            }
                        }
                    })

                    order = orderResult
                    console.log(`[Recharge] Created order ${order.id} for subscription ${subscription.id}`)
                }
            }
        } catch (orderError) {
            console.error("[Recharge] Failed to create order:", orderError)
        }

        return res.status(200).json({
            success: true,
            message: "Recharge successful!",
            recharge: {
                nexel_number,
                plan_name: plan.name,
                amount: plan.price,
                validity_days: plan.validity_days,
            },
            subscription: {
                id: subscription.id,
                end_date: subscription.end_date,
                data_balance_mb: subscription.data_balance_mb,
                voice_balance_min: subscription.voice_balance_min,
            },
            invoice: {
                invoice_number: invoice.invoice_number,
                amount: invoice.total_amount,
                status: invoice.status,
            },
            order: order ? {
                id: order.id,
                status: order.status,
                message: "Order created for tracking (digital delivery)"
            } : null
        })

    } catch (error) {
        console.error("[Recharge] Error:", error)
        return res.status(500).json({
            error: error instanceof Error ? error.message : "Recharge failed"
        })
    }
}
