import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import TelecomCoreModuleService from "../../../../modules/telecom-core/service"

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
            payment_method = "manual"  // Default to manual payment for POC
        } = req.body as any

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
        let msisdn = null

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

        // Step 5: Reserve MSISDN (15 min expiry)
        const reservationExpiry = new Date()
        reservationExpiry.setMinutes(reservationExpiry.getMinutes() + 15)

        await telecomModule.updateMsisdnInventories({
            id: msisdn.id,
            status: "reserved",
            customer_id,
            reserved_at: new Date(),
            reservation_expires_at: reservationExpiry,
        })

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
                if (variant) {
                    // Create order using workflow
                    const { result: orderResult } = await createOrderWorkflow(req.scope).run({
                        input: {
                            customer_id,
                            region_id: region.id, // TODO: Get from config
                            currency_code: "inr",
                            items: [
                                {
                                    variant_id: variant.id,
                                    quantity: 1,
                                    metadata: {
                                        subscription_id: subscription.id,
                                        msisdn: msisdn.phone_number,
                                        item_type: "plan"
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
                                sim_activated: false  // Will be true after fulfillment
                            }
                        }
                    })

                    order = orderResult
                    console.log(`[SIM Purchase] Created order ${order.id} for subscription ${subscription.id}`)
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
                status: "reserved",  // Will be activated after order fulfillment
                tier: msisdn.tier,
                region: msisdn.region_code,
            },
            subscription: {
                id: subscription.id,
                plan_name: plan.name,
                start_date: subscription.start_date,
                end_date: subscription.end_date,
                data_balance_mb: subscription.data_balance_mb,
                voice_balance_min: subscription.voice_balance_min,
            },
            invoice: {
                id: invoice.id,
                invoice_number: invoice.invoice_number,
                amount: invoice.total_amount,
                status: invoice.status,
            },
            order: order ? {
                id: order.id,
                status: order.status,
                message: "Order created for fulfillment tracking"
            } : null,
            next_steps: [
                "Your order has been placed successfully",
                "Your SIM will be delivered to your registered address",
                "Once delivered and activated, you can login with: " + msisdn.phone_number,
                "Payment verification and fulfillment pending"
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
