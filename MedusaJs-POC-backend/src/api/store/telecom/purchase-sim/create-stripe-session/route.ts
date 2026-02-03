import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

const STRIPE_PROVIDER_ID = "pp_stripe_stripe"

/**
 * Create a Stripe payment session for SIM purchase (no cart).
 * POST /store/telecom/purchase-sim/create-stripe-session
 *
 * Body: { plan_id, amount, currency_code, region_id }
 * Returns: { client_secret, payment_collection_id, payment_session_id }
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
    try {
        const { plan_id, amount, currency_code, region_id } = req.body as {
            plan_id?: string
            amount?: number
            currency_code?: string
            region_id?: string
        }

        if (amount == null || amount <= 0) {
            return res.status(400).json({
                error: "Invalid amount",
                message: "amount is required and must be greater than 0",
            })
        }

        const paymentModule = req.scope.resolve("payment")
        const regionModule = req.scope.resolve("region")

        let region: { id: string } | null = null
        if (region_id) {
            const regions = await regionModule.listRegions({ id: region_id }, { take: 1 })
            region = regions[0] ?? null
        }
        if (!region) {
            const regions = await regionModule.listRegions({}, { take: 1 })
            region = regions[0] ?? null
        }
        if (!region) {
            return res.status(400).json({
                error: "No region",
                message: "No region found. Configure a region in the backend.",
            })
        }

        const currency = (currency_code || "inr").toLowerCase()

        const paymentCollection = await paymentModule.createPaymentCollections({
            region_id: region.id,
            currency_code: currency,
            amount,
            metadata: {
                plan_id: plan_id || undefined,
                sim_purchase: true,
            },
        } as any)

        const paymentSession = await paymentModule.createPaymentSession(
            (paymentCollection as any).id,
            {
                provider_id: STRIPE_PROVIDER_ID,
                amount,
                currency_code: currency,
                data: {},
            }
        )

        const sessionData = (paymentSession as any).data || {}
        const clientSecret = sessionData.client_secret

        if (!clientSecret) {
            return res.status(500).json({
                error: "Stripe session error",
                message: "Payment provider did not return a client_secret.",
            })
        }

        return res.status(200).json({
            client_secret: clientSecret,
            payment_collection_id: (paymentCollection as any).id,
            payment_session_id: (paymentSession as any).id,
        })
    } catch (error) {
        console.error("[create-stripe-session] Error:", error)
        return res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to create Stripe session",
        })
    }
}
