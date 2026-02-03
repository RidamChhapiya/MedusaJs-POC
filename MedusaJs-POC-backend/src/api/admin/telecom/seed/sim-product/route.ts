import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { createProductsWorkflow } from "@medusajs/core-flows"

/**
 * Seed SIM Product
 * Creates the base SIM Card product with tier variants
 * Run once: POST /admin/telecom/seed/sim-product
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
    try {
        console.log("[Seed] Creating SIM product...")

        // Create SIM product with variants using workflow
        const { result: products } = await createProductsWorkflow(req.scope).run({
            input: {
                products: [
                    {
                        title: "Nexel SIM Card",
                        subtitle: "Physical SIM card for Nexel telecom service",
                        description: "Get your Nexel SIM card delivered to your address. Available in Standard, Gold, and Platinum tiers with premium phone numbers.",
                        is_giftcard: false,
                        discountable: false,
                        handle: "nexel-sim-card",
                        status: "published",
                        options: [
                            {
                                title: "Tier",
                                values: ["Standard", "Gold", "Platinum"]
                            }
                        ],
                        variants: [
                            {
                                title: "Standard SIM Card",
                                sku: "SIM-STANDARD",
                                manage_inventory: false,
                                allow_backorder: true,
                                options: {
                                    Tier: "Standard"
                                },
                                prices: [
                                    {
                                        currency_code: "inr",
                                        amount: 0  // Free SIM
                                    }
                                ]
                            },
                            {
                                title: "Gold SIM Card",
                                sku: "SIM-GOLD",
                                manage_inventory: false,
                                allow_backorder: true,
                                options: {
                                    Tier: "Gold"
                                },
                                prices: [
                                    {
                                        currency_code: "inr",
                                        amount: 0  // Free SIM
                                    }
                                ]
                            },
                            {
                                title: "Platinum SIM Card",
                                sku: "SIM-PLATINUM",
                                manage_inventory: false,
                                allow_backorder: true,
                                options: {
                                    Tier: "Platinum"
                                },
                                prices: [
                                    {
                                        currency_code: "inr",
                                        amount: 0  // Free SIM
                                    }
                                ]
                            }
                        ],
                        metadata: {
                            product_type: "sim_card",
                            requires_physical_delivery: true,
                            category: "telecom"
                        }
                    }
                ]
            }
        })

        const simProduct = products[0]

        console.log(`[Seed] SIM product created: ${simProduct.id}`)
        console.log(`[Seed] Variants:`, simProduct.variants?.map(v => ({
            id: v.id,
            title: v.title,
            sku: v.sku
        })))

        return res.status(201).json({
            success: true,
            message: "SIM product created successfully",
            product: {
                id: simProduct.id,
                title: simProduct.title,
                handle: simProduct.handle,
                variants: simProduct.variants?.map(v => ({
                    id: v.id,
                    title: v.title,
                    sku: v.sku,
                    tier: (v as any).options?.Tier
                }))
            },
            next_steps: [
                `Add this to your .env file:`,
                `SIM_PRODUCT_ID=${simProduct.id}`,
                `Then restart the server`
            ]
        })

    } catch (error) {
        console.error("[Seed] Failed to create SIM product:", error)
        return res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to create SIM product"
        })
    }
}
