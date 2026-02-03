import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Client } from "pg"
import { Modules } from "@medusajs/framework/utils"
import TelecomCoreModuleService from "@modules/telecom-core/service"
import MsisdnInventory from "../../../../modules/telecom-core/models/msisdn-inventory"

/**
 * SIM Purchase API
 * POST /store/telecom/purchase-sim
 * 
 * Complete SIM purchase workflow:
 * 1. Validate customer and KYC status
 * 2. Find/reserve available MSISDN
 * 3. Link MSISDN to customer
 * 4. Create subscription with plan
 * 5. Activate MSISDN
 * 6. Update customer to Nexel subscriber
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
    const telecomModule: TelecomCoreModuleService = req.scope.resolve("telecom")

    try {
        const {
            customer_id,
            plan_id,
            preferred_number, // Optional: customer can choose
            sim_password, // Password for Nexel number login
            payment_method = "manual",  // Default to manual payment for POC
            // Stripe flow: when frontend already confirmed card payment
            payment_collection_id,
            payment_session_id,
            // Shipping address for physical SIM delivery
            shipping_address,
            shipping_city,
            shipping_state,
            shipping_pincode,
            shipping_landmark
        } = req.body as any

        const isStripePayment = Boolean(payment_collection_id && payment_session_id)


        // Validate shipping address
        if (!shipping_address || !shipping_city || !shipping_state || !shipping_pincode) {
            return res.status(400).json({
                error: "Shipping address is required for SIM delivery",
                required_fields: ["shipping_address", "shipping_city", "shipping_state", "shipping_pincode"]
            })
        }
        // Step 1: Validate customer exists
        const profiles = await telecomModule.listCustomerProfiles({
            customer_id
        })

        if (profiles.length === 0) {
            return res.status(404).json({
                error: "Customer not found"
            })
        }

        const profile = profiles[0]

        // Step 2: Check KYC status
        if (profile.kyc_status !== "verified") {
            return res.status(400).json({
                error: "KYC not verified",
                message: "Please complete e-KYC verification before purchasing a SIM.",
                kyc_status: profile.kyc_status
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

        // Step 4: Find available MSISDN
        let msisdn: Awaited<ReturnType<typeof telecomModule.listMsisdnInventories>>[number] | null = null

        if (preferred_number) {
            // Check if preferred number is available
            const preferred = await telecomModule.listMsisdnInventories({
                phone_number: preferred_number,
                status: "available"
            })

            if (preferred.length > 0) {
                msisdn = preferred[0]
            } else {
                return res.status(400).json({
                    error: "Preferred number not available",
                    message: `The number ${preferred_number} is not available. Please choose another.`
                })
            }
        } else {
            // Find any available number
            const available = await telecomModule.listMsisdnInventories({
                status: "available"
            }, { take: 1 })

            if (available.length === 0) {
                return res.status(503).json({
                    error: "No numbers available",
                    message: "Sorry, no phone numbers are currently available. Please try again later."
                })
            }

            msisdn = available[0]
        }

        // Ensure MSISDN was found (TypeScript null safety)
        if (!msisdn) {
            return res.status(500).json({
                error: "Failed to assign MSISDN",
                message: "An unexpected error occurred while assigning a phone number."
            })
        }

        // Step 5: Reserve MSISDN (15 min expiry)
        const reservationExpiry = new Date()
        reservationExpiry.setMinutes(reservationExpiry.getMinutes() + 15)

        console.log(`[SIM Purchase] Updating MSISDN ${msisdn.phone_number} to reserved status...`)
        console.log(`[SIM Purchase] Current MSISDN status: ${msisdn.status}`)

        const updatedMsisdn = await telecomModule.updateMsisdnInventories({
            id: msisdn.id,
            status: "reserved",
            customer_id,
            reserved_at: new Date(),
            reservation_expires_at: reservationExpiry,
        })

        console.log(`[SIM Purchase] MSISDN update result:`, updatedMsisdn)
        console.log(`[SIM Purchase] MSISDN ${msisdn.phone_number} status after update: ${updatedMsisdn.status}`)

        // Step 6: Create subscription
        const subscription = await telecomModule.createSubscriptions({
            customer_id,
            plan_id: plan.id,
            msisdn: msisdn.phone_number,
            status: "pending",  // Will be activated after order fulfillment
            start_date: new Date(),
            end_date: new Date(Date.now() + (plan.validity_days || 30) * 24 * 60 * 60 * 1000),
            data_balance_mb: plan.data_quota_mb,
            voice_balance_min: plan.voice_quota_min,
            auto_renew: true,
        })

        // Step 7: Keep MSISDN reserved until fulfillment
        // MSISDN will be activated when admin fulfills the order
        // No action needed here - stays in 'reserved' status

        // Step 8: Update customer profile to Nexel subscriber
        const currentNexelNumbers = profile.nexel_numbers || []
        await telecomModule.updateCustomerProfiles({
            id: profile.id,
            is_nexel_subscriber: true,
            nexel_numbers: [...(currentNexelNumbers as string[]), msisdn.phone_number] as unknown as Record<string, unknown>,
        })

        // Step 9: Initialize usage counter
        const currentDate = new Date()
        await telecomModule.createUsageCounters({
            subscription_id: subscription.id,
            period_month: currentDate.getMonth() + 1,
            period_year: currentDate.getFullYear(),
            data_used_mb: 0,
            voice_used_min: 0,
        })

        // Step 10: Create invoice (mock payment)
        const invoice = await telecomModule.createInvoices({
            customer_id,
            subscription_id: subscription.id,
            invoice_number: `INV-${Date.now()}`,
            subtotal: plan.price,
            tax_amount: 0,
            total_amount: plan.price,
            issue_date: new Date(),
            due_date: new Date(),
            paid_date: new Date(),
            status: "paid",
            line_items: [{
                description: `${plan.name} - ${plan.validity_days} days`,
                quantity: 1,
                unit_price: plan.price,
                amount: plan.price
            }]
        } as any)

        // Step 11: Create Medusa Order for tracking and fulfillment
        let order: any = null
        try {
            const { createOrderWorkflow } = await import("@medusajs/core-flows")

            // Get actual region from database
            const regionModule = req.scope.resolve("region")
            const regions = await regionModule.listRegions({}, { take: 1 })
            const region = regions[0]

            if (!region) {
                console.warn("[SIM Purchase] No region found in database, skipping order creation")
            } else {
                console.log(`[SIM Purchase] Using region ${region.id}`)

                // Prepare items array
                const items: any[] = []

                // 1. Process Plan Item
                if (plan.product_id) {
                    try {
                        const productModule = req.scope.resolve("product")
                        const products = await productModule.listProducts({
                            id: [plan.product_id]
                        }, { relations: ["variants"] })

                        const variant = products[0]?.variants?.[0]
                        if (variant) {
                            items.push({
                                variant_id: variant.id,
                                quantity: 1,
                                unit_price: plan.price || 0,
                                title: plan.name || "Telecom Plan",
                                metadata: {
                                    subscription_id: subscription.id,
                                    msisdn: msisdn.phone_number,
                                    item_type: "plan",
                                    validity_days: plan.validity_days || 30
                                }
                            })
                        } else {
                            throw new Error("Variant not found")
                        }
                    } catch (e) {
                        // Fallback to custom item
                        console.warn("[SIM Purchase] Failed to resolve plan product, using custom item")
                        items.push({
                            title: plan.name || "Telecom Plan",
                            quantity: 1,
                            unit_price: plan.price || 0,
                            metadata: {
                                subscription_id: subscription.id,
                                msisdn: msisdn.phone_number,
                                item_type: "plan",
                                validity_days: plan.validity_days || 30
                            }
                        })
                    }
                } else {
                    // No product_id, use custom item
                    items.push({
                        title: plan.name || "Telecom Plan",
                        quantity: 1,
                        unit_price: plan.price || 0,
                        metadata: {
                            subscription_id: subscription.id,
                            msisdn: msisdn.phone_number,
                            item_type: "plan",
                            validity_days: plan.validity_days || 30
                        }
                    })
                }

                // 2. Process SIM Item
                const simProductId = process.env.SIM_PRODUCT_ID
                if (simProductId) {
                    try {
                        const productModule = req.scope.resolve("product")
                        const simProducts = await productModule.listProducts({
                            id: [simProductId]
                        }, { relations: ["variants", "variants.options"] })

                        const simProduct = simProducts[0]
                        if (simProduct?.variants) {
                            let simVariant = simProduct.variants.find((v: any) =>
                                v.title?.toLowerCase().includes(msisdn.tier.toLowerCase())
                            ) || simProduct.variants[0]

                            if (simVariant) {
                                items.push({
                                    variant_id: simVariant.id,
                                    quantity: 1,
                                    unit_price: 0,
                                    title: `${msisdn.tier} SIM Card - ${msisdn.phone_number}`,
                                    metadata: {
                                        msisdn: msisdn.phone_number,
                                        item_type: "sim_card",
                                        tier: msisdn.tier
                                    }
                                })
                            }
                        }
                    } catch (e) {
                        console.warn("[SIM Purchase] Failed to resolve SIM product")
                    }
                }

                // Create order using workflow
                const { result: orderResult } = await createOrderWorkflow(req.scope).run({
                    input: {
                        customer_id,
                        region_id: region.id,
                        currency_code: "inr",
                        items: items,
                        metadata: {
                            order_type: "sim_purchase",
                            subscription_id: subscription.id,
                            msisdn: msisdn.phone_number,
                            requires_fulfillment: true,
                            invoice_id: invoice.id,
                            payment_method: payment_method,
                            payment_verified: false,
                            sim_activated: false,
                            shipping_address: {
                                address: shipping_address,
                                city: shipping_city,
                                state: shipping_state,
                                pincode: shipping_pincode,
                                landmark: shipping_landmark
                            }
                        }
                    }
                })

                order = orderResult
                console.log(`[SIM Purchase] Created order ${order.id} for subscription ${subscription.id}`)
                // Emit order.placed so subscribers (X service, telecom provisioning) run
                const eventBus = req.scope.resolve(Modules.EVENT_BUS)
                await eventBus.emit({ name: "order.placed", data: { id: order.id } })
            }

            // Stripe: authorize existing session (already confirmed on frontend), capture, link, activate
            if (isStripePayment && order) {
                try {
                    const paymentModule = req.scope.resolve("payment")
                    await paymentModule.authorizePaymentSession(payment_session_id, {})
                    const payments = await paymentModule.listPayments({
                        payment_collection_id: [payment_collection_id],
                    } as any)
                    if (payments.length > 0) {
                        await paymentModule.capturePayment({ payment_id: payments[0].id })
                        await telecomModule.updateMsisdnInventories({
                            id: msisdn.id,
                            status: "active",
                        })
                        await telecomModule.updateSubscriptions({
                            id: subscription.id,
                            status: "active",
                        })
                        msisdn.status = "active"
                        subscription.status = "active"
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
                        console.log(`[SIM Purchase] Stripe payment captured and linked to order ${order.id}`)
                    }
                } catch (stripeErr) {
                    console.error("[SIM Purchase] Stripe capture/link failed:", stripeErr)
                    // Don't fail the response - order and SIM are created; admin can reconcile
                }
            }

            // Create payment collection and capture for manual payment
            if (payment_method === "manual" && order && !isStripePayment) {
                try {
                    console.log(`[SIM Purchase] Creating payment collection for order ${order.id}`)

                    // Step 1: Get payment module and create payment collection
                    const paymentModule = req.scope.resolve("payment")

                    const paymentCollection: any = await paymentModule.createPaymentCollections({
                        region_id: region.id,
                        currency_code: "inr",
                        amount: plan.price || 0,  // Amount in rupees (Medusa v2)
                        metadata: {
                            order_id: order.id,
                            subscription_id: subscription.id,
                            payment_method: "manual"
                        }
                    } as any)

                    console.log(`[SIM Purchase] Payment collection created: ${paymentCollection.id}`)

                    // Step 2: Create payment session for pp_system_default (manual payment provider)
                    const paymentSession = await paymentModule.createPaymentSession(paymentCollection.id, {
                        provider_id: "pp_system_default",  // Manual payment provider (system provider)
                        amount: plan.price || 0,
                        currency_code: "inr",
                        data: {
                            order_id: order.id
                        }
                    })

                    console.log(`[SIM Purchase] Payment session created: ${paymentSession.id}`)

                    // Step 3: Authorize the payment session (creates Payment record)
                    await paymentModule.authorizePaymentSession(paymentSession.id, {})
                    console.log(`[SIM Purchase] Payment session authorized`)

                    // Step 4: Get the created payment
                    const payments = await paymentModule.listPayments({
                        payment_collection_id: [paymentCollection.id]
                    } as any)

                    if (payments.length > 0) {
                        const payment = payments[0]
                        console.log(`[SIM Purchase] Payment found: ${payment.id}`)

                        // Step 5: Capture the payment (mark as PAID)
                        await paymentModule.capturePayment({
                            payment_id: payment.id
                        })


                        console.log(`[SIM Purchase] ✅ Payment captured - Order ${order.id} marked as PAID`)

                        // ACTIVATE SERVICE NOW
                        console.log(`[SIM Purchase] Activating MSISDN ${msisdn.phone_number} and Subscription ${subscription.id}...`)

                        await telecomModule.updateMsisdnInventories({
                            id: msisdn.id,
                            status: "active"
                        })

                        await telecomModule.updateSubscriptions({
                            id: subscription.id,
                            status: "active"
                        })

                        // Update local objects for response
                        msisdn.status = "active"
                        subscription.status = "active"

                        // Step 6: Link payment collection to order (direct database insert via pg client)
                        try {
                            console.log("[SIM Purchase] Linking payment collection using direct PG connection...")
                            const client = new Client({
                                connectionString: process.env.DATABASE_URL
                            })
                            await client.connect()

                            await client.query(
                                `INSERT INTO order_payment_collection (id, order_id, payment_collection_id)
                                         VALUES ($1, $2, $3)
                                         ON CONFLICT DO NOTHING`,
                                [
                                    `ordpaycol_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                                    order.id,
                                    paymentCollection.id
                                ]
                            )

                            await client.end()

                            console.log(`[SIM Purchase] ✅ Linked payment collection ${paymentCollection.id} to order ${order.id}`)
                        } catch (linkError) {
                            console.error("[SIM Purchase] Failed to link payment collection:", linkError)
                        }
                    }

                } catch (paymentError) {
                    console.error("[SIM Purchase] Payment processing failed:", paymentError)
                    // Don't fail the purchase - admin can manually process payment later
                }
            }
        } catch (orderError) {
            console.error("[SIM Purchase] Failed to create order:", orderError)
        }

        return res.status(201).json({
            success: true,
            message: "SIM purchased successfully!",
            sim: {
                phone_number: msisdn.phone_number,
                status: msisdn.status,
                tier: msisdn.tier,
                region: msisdn.region_code,
            },
            subscription: {
                id: subscription.id,
                status: subscription.status,
                plan_name: plan.name,
                start_date: subscription.start_date,
                end_date: subscription.end_date,
                data_balance_mb: subscription.data_balance_mb,
                voice_balance_min: subscription.voice_balance_min,
            },
            invoice: {
                id: invoice.id,
                invoice_number: invoice.invoice_number,
                amount: invoice.total_amount,  // Convert paise to rupees
                currency: "INR",
                status: invoice.status,
            },
            order: order ? {
                id: order.id,
                status: "pending",  // Awaiting payment
                message: "Order placed - awaiting payment and fulfillment"
            } : null,
            next_steps: [
                "📦 Your SIM purchase order has been placed!",
                "✅ Service Activated!",
                "💳 Payment: ₹" + (plan.price) + " (" + payment_method + ")",
                "📍 Delivery to: " + shipping_city + ", " + shipping_state,
                "📞 Active number: " + msisdn.phone_number
            ]
        })

    } catch (error) {
        console.error("[SIM Purchase] Error:", error)
        return res.status(500).json({
            error: error instanceof Error ? error.message : "SIM purchase failed"
        })
    }
}

/**
 * Get Available Numbers
 * GET /store/telecom/purchase-sim/available-numbers
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const telecomModule: TelecomCoreModuleService = req.scope.resolve("telecom")

    try {
        const plans = await telecomModule.listPlanConfigurations({
            is_active: true
        })

        return res.json({
            plans: plans.map(p => ({
                id: p.id,
                name: p.name,
                price: p.price,
                data_quota_mb: p.data_quota_mb,
                voice_quota_min: p.voice_quota_min,
                sms_quota: 100, // Defualt since model doesn't have it
                validity_days: p.validity_days,
                type: p.type
            })),
            count: plans.length
        })

    } catch (error) {
        console.error("[Plans] Error:", error)
        return res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to fetch plans"
        })
    }
}
