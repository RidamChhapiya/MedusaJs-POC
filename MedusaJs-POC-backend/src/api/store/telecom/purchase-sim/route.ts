import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import TelecomCoreModuleService from "../../../../modules/telecom-core/service"
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
            // Shipping address for physical SIM delivery
            shipping_address,
            shipping_city,
            shipping_state,
            shipping_pincode,
            shipping_landmark
        } = req.body as any


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
            end_date: new Date(Date.now() + plan.validity_days * 24 * 60 * 60 * 1000),
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
            nexel_numbers: [...currentNexelNumbers, msisdn.phone_number],
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
        })

        // Step 11: Create Medusa Order for tracking and fulfillment
        let order = null
        try {
            const { createOrderWorkflow } = await import("@medusajs/core-flows")

            // Get plan product for order line item
            if (!plan.product_id) {
                console.warn("[SIM Purchase] Plan has no product_id, skipping order creation")
            } else {
                // Get product details using list (Medusa v2 API)
                const productModule = req.scope.resolve("product")
                const products = await productModule.listProducts({
                    id: [plan.product_id]
                }, {
                    relations: ["variants"]
                })

                const product = products[0]
                console.log(`[SIM Purchase] Products found: ${products.length}, Product: ${product?.id}, Variants: ${product?.variants?.length}`)
                const variant = product?.variants?.[0]
                if (!variant) console.warn(`[SIM Purchase] No variant found for product ${plan.product_id}`)

                // Get actual region from database
                const regionModule = req.scope.resolve("region")
                const regions = await regionModule.listRegions({}, { take: 1 })
                const region = regions[0]
                if (!region) {
                    console.warn("[SIM Purchase] No region found in database, skipping order creation")
                    return
                }
                console.log(`[SIM Purchase] Using region ${region.id}`)

                // Get SIM product variant based on MSISDN tier
                const simProductId = process.env.SIM_PRODUCT_ID
                let simVariant = null

                if (simProductId) {
                    const simProducts = await productModule.listProducts({
                        id: [simProductId]
                    }, {
                        relations: ["variants", "variants.options"]
                    })

                    const simProduct = simProducts[0]
                    if (simProduct && simProduct.variants) {
                        // Find variant matching MSISDN tier
                        simVariant = simProduct.variants.find((v: any) => {
                            const tierValue = v.title?.toLowerCase().includes(msisdn.tier.toLowerCase())
                            return tierValue
                        })

                        if (!simVariant) {
                            // Fallback to first variant
                            simVariant = simProduct.variants[0]
                        }

                        console.log(`[SIM Purchase] Using SIM variant: ${simVariant.title} for tier ${msisdn.tier}`)
                    } else {
                        console.warn(`[SIM Purchase] SIM product ${simProductId} not found or has no variants`)
                    }
                } else {
                    console.warn("[SIM Purchase] SIM_PRODUCT_ID not configured, order will only include plan")
                }

                if (variant) {
                    // Create order using workflow
                    const { result: orderResult } = await createOrderWorkflow(req.scope).run({
                        input: {
                            customer_id,
                            region_id: region.id, // TODO: Get from config
                            currency_code: "inr",
                            items: [
                                // SIM Card item (if SIM product configured)
                                ...(simVariant ? [{
                                    variant_id: simVariant.id,
                                    quantity: 1,
                                    unit_price: 0,  // SIM is free
                                    title: `${msisdn.tier} SIM Card - ${msisdn.phone_number}`,
                                    metadata: {
                                        msisdn: msisdn.phone_number,
                                        item_type: "sim_card",
                                        tier: msisdn.tier
                                    }
                                }] : []),
                                // Plan item
                                {
                                    variant_id: variant.id,
                                    quantity: 1,
                                    unit_price: plan.price,  // Price in paise
                                    title: plan.name,
                                    metadata: {
                                        subscription_id: subscription.id,
                                        msisdn: msisdn.phone_number,
                                        item_type: "plan",
                                        validity_days: plan.validity_days
                                    }
                                }
                            ],
                            metadata: {
                                order_type: "sim_purchase",
                                subscription_id: subscription.id,
                                msisdn: msisdn.phone_number,
                                requires_fulfillment: true, // Physical SIM delivery
                                invoice_id: invoice.id,
                                payment_method: payment_method,
                                payment_verified: false,  // Admin needs to verify
                                sim_activated: false,  // Will be true after fulfillment
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

                    // Create payment collection and capture for manual payment
                    if (payment_method === "manual" && order) {
                        try {
                            console.log(`[SIM Purchase] Creating payment collection for order ${order.id}`)

                            // Step 1: Get payment module and create payment collection
                            const paymentModule = req.scope.resolve("payment")

                            const paymentCollection = await paymentModule.createPaymentCollections({
                                region_id: region.id,
                                currency_code: "inr",
                                amount: plan.price,  // Amount in rupees (Medusa v2)
                                metadata: {
                                    order_id: order.id,
                                    subscription_id: subscription.id,
                                    payment_method: "manual"
                                }
                            })

                            console.log(`[SIM Purchase] Payment collection created: ${paymentCollection.id}`)

                            // Step 2: Create payment session for pp_system (manual payment provider)
                            const paymentSession = await paymentModule.createPaymentSession(paymentCollection.id, {
                                provider_id: "pp_system",  // Manual payment provider
                                amount: plan.price,
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
                            })

                            if (payments.length > 0) {
                                const payment = payments[0]
                                console.log(`[SIM Purchase] Payment found: ${payment.id}`)

                                // Step 5: Capture the payment (mark as PAID)
                                await paymentModule.capturePayment({
                                    payment_id: payment.id
                                })

                                console.log(`[SIM Purchase] ✅ Payment captured - Order ${order.id} marked as PAID`)
                            }

                        } catch (paymentError) {
                            console.error("[SIM Purchase] Payment processing failed:", paymentError)
                            console.error("[SIM Purchase] Error details:", JSON.stringify(paymentError, null, 2))
                            // Don't fail the purchase - admin can manually process payment later
                        }
                    }
                }
            }
        } catch (orderError) {
            console.error("[SIM Purchase] Failed to create order:", orderError)
            // Don't fail the purchase if order creation fails
        }

        return res.status(201).json({
            success: true,
            message: "SIM purchased successfully!",
            sim: {
                phone_number: msisdn.phone_number,
                status: "reserved",  // Reserved until fulfillment
                tier: msisdn.tier,
                region: msisdn.region_code,
            },
            subscription: {
                id: subscription.id,
                status: "pending",  // Pending until fulfillment
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
                "💳 Payment: ₹" + (plan.price) + " (" + payment_method + ")",
                "📍 Delivery to: " + shipping_city + ", " + shipping_state,
                "⏳ Your SIM will be activated after delivery confirmation",
                "📞 Reserved number: " + msisdn.phone_number
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
        const { tier, region_code, limit = 10 } = req.query as any

        const filters: any = { status: "available" }
        if (tier) filters.tier = tier
        if (region_code) filters.region_code = region_code

        const available = await telecomModule.listMsisdnInventories(filters, {
            take: parseInt(limit)
        })

        return res.json({
            available_numbers: available.map(m => ({
                phone_number: m.phone_number,
                tier: m.tier,
                region_code: m.region_code,
            })),
            count: available.length
        })

    } catch (error) {
        console.error("[Available Numbers] Error:", error)
        return res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to fetch available numbers"
        })
    }
}
