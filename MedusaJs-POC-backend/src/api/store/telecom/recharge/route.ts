import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { Client } from "pg"
import TelecomCoreModuleService from "@modules/telecom-core/service"

/**
 * Recharge API
 * POST /store/telecom/recharge
 *
 * Allows anyone to recharge any Nexel number
 * Validates Nexel number exists and is active
 * Optional: payment_collection_id + payment_session_id for Stripe (after frontend confirmCardPayment)
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
    const telecomModule: TelecomCoreModuleService = req.scope.resolve("telecom")

    try {
        const {
            nexel_number,
            plan_id,
            payment_method = "manual",
            payment_collection_id,
            payment_session_id,
            recharge_for_self = false
        } = req.body as any

        const isStripePayment = Boolean(payment_collection_id && payment_session_id)

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
            const validityDays = plan.validity_days ?? 30
            const newEndDate = new Date(currentEndDate.getTime() + validityDays * 24 * 60 * 60 * 1000)

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

            // UsageCounter model has only period_month, period_year, data_used_mb, voice_used_min (no quota fields)
            if (counters.length > 0) {
                await telecomModule.updateUsageCounters({
                    id: counters[0].id,
                    data_used_mb: counters[0].data_used_mb,
                    voice_used_min: counters[0].voice_used_min,
                } as any)
            }

        } else {
            // Create new subscription (service may return single object or array)
            const created = await telecomModule.createSubscriptions({
                customer_id: msisdn.customer_id,
                plan_id: plan.id,
                msisdn: nexel_number,
                status: "active",
                start_date: new Date(),
                end_date: new Date(Date.now() + (plan.validity_days ?? 30) * 24 * 60 * 60 * 1000),
                data_balance_mb: plan.data_quota_mb,
                voice_balance_min: plan.voice_quota_min,
                auto_renew: false,
            })
            subscription = Array.isArray(created) ? created[0] : created

            // Create usage counter (model: subscription_id, period_month, period_year, data_used_mb, voice_used_min)
            const nowDate = new Date()
            await telecomModule.createUsageCounters({
                subscription_id: subscription.id,
                period_month: nowDate.getMonth() + 1,
                period_year: nowDate.getFullYear(),
                data_used_mb: 0,
                voice_used_min: 0,
            })
        }

        // Step 5: Create invoice
        const now = new Date()
        const invoice = await telecomModule.createInvoices({
            customer_id: msisdn.customer_id ?? "",
            subscription_id: subscription.id,
            invoice_number: `RECH-${Date.now()}`,
            subtotal: plan.price,
            tax_amount: 0,
            total_amount: plan.price,
            issue_date: now,
            due_date: now,
            status: "paid",
            paid_date: now,
            line_items: [{
                description: `Recharge: ${plan.name}${plan.validity_days ? ` - ${plan.validity_days} days` : ''}`,
                quantity: 1,
                unit_price: plan.price,
                amount: plan.price
            }]
        } as any)

        // Step 6: Create Medusa Order for tracking (digital delivery)
        let order: any = null
        const regionModule = req.scope.resolve("region")
        const regions = await regionModule.listRegions({}, { take: 1 })
        const region = regions[0]

        try {
            const { createOrderWorkflow } = await import("@medusajs/core-flows")

            const items: any[] = []
            if (plan.product_id) {
                const productModule = req.scope.resolve("product")
                const [product] = await productModule.listProducts({ id: plan.product_id }, { relations: ["variants"] })
                const variant = product?.variants?.[0]
                if (variant) {
                    items.push({
                        variant_id: variant.id,
                        quantity: 1,
                        metadata: {
                            subscription_id: subscription.id,
                            msisdn: nexel_number,
                            item_type: "recharge"
                        }
                    })
                }
            }
            if (items.length === 0) {
                items.push({
                    title: `Recharge: ${plan.name}`,
                    quantity: 1,
                    unit_price: plan.price,
                    metadata: {
                        subscription_id: subscription.id,
                        msisdn: nexel_number,
                        item_type: "recharge"
                    }
                })
            }

            if (region && items.length > 0) {
                const { result: orderResult } = await createOrderWorkflow(req.scope).run({
                    input: {
                        customer_id: msisdn.customer_id,
                        region_id: region.id,
                        currency_code: "inr",
                        items,
                        metadata: {
                            order_type: "recharge",
                            subscription_id: subscription.id,
                            msisdn: nexel_number,
                            requires_fulfillment: false,
                            invoice_id: invoice.id,
                            payment_method: isStripePayment ? "stripe" : payment_method,
                        }
                    }
                })
                order = orderResult
                console.log(`[Recharge] Created order ${order.id} for subscription ${subscription.id}`)
                const eventBus = req.scope.resolve(Modules.EVENT_BUS)
                await eventBus.emit({ name: "order.placed", data: { id: order.id } })
            }

            // Stripe: authorize existing session, capture, link to order
            if (isStripePayment && order) {
                try {
                    const paymentModule = req.scope.resolve("payment")
                    await paymentModule.authorizePaymentSession(payment_session_id, {})
                    const payments = await paymentModule.listPayments({
                        payment_collection_id: [payment_collection_id],
                    } as any)
                    if (payments.length > 0) {
                        await paymentModule.capturePayment({ payment_id: payments[0].id })
                        const client = new Client({
                            connectionString: process.env.DATABASE_URL,
                        })
                        await client.connect()
                        await client.query(
                            `INSERT INTO order_payment_collection (id, order_id, payment_collection_id)
                             VALUES ($1, $2, $3)
                             ON CONFLICT DO NOTHING`,
                            [
                                `ordpaycol_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                                order.id,
                                payment_collection_id,
                            ]
                        )
                        await client.end()
                        console.log(`[Recharge] Stripe payment captured and linked to order ${order.id}`)
                    }
                } catch (stripeErr) {
                    console.error("[Recharge] Stripe capture/link failed:", stripeErr)
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
