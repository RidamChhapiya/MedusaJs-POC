import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import TelecomCoreModuleService from "@modules/telecom-core/service"

/**
 * Get Available Numbers
 * GET /store/telecom/purchase-sim/available-numbers
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const telecomModule: TelecomCoreModuleService = req.scope.resolve("telecom")

    try {
        const { tier, region_code, limit = 10, offset = 0 } = req.query as any

        const filters: any = { status: "available" }
        if (tier) filters.tier = tier
        if (region_code) filters.region_code = region_code

        const available = await telecomModule.listMsisdnInventories(filters, {
            take: parseInt(limit),
            skip: parseInt(offset)
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
