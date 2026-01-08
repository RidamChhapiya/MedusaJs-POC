import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import TelecomCoreModuleService from "../../../../modules/telecom-core/service"

/**
 * Admin API: MSISDN Inventory Management
 * GET /admin/telecom/msisdn-inventory
 * 
 * Provides complete view of phone number inventory with:
 * - Filtering by status, tier, region
 * - Pagination
 * - Statistics
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const telecomModule: TelecomCoreModuleService = req.scope.resolve("telecom")

    const {
        limit = 100,
        offset = 0,
        status,
        tier,
        region_code,
        search
    } = req.query as any

    try {
        // Build filters
        const filters: any = {}
        if (status) filters.status = status
        if (tier) filters.tier = tier
        if (region_code) filters.region_code = region_code
        if (search) filters.phone_number = { $like: `%${search}%` }

        // Get MSISDNs
        const msisdns = await telecomModule.listMsisdnInventories(filters, {
            take: parseInt(limit),
            skip: parseInt(offset)
        })

        // Get all MSISDNs for statistics
        const allMsisdns = await telecomModule.listMsisdnInventories({})

        // Calculate statistics
        const stats = {
            total: allMsisdns.length,
            available: allMsisdns.filter(m => m.status === "available").length,
            reserved: allMsisdns.filter(m => m.status === "reserved").length,
            active: allMsisdns.filter(m => m.status === "active").length,
            cooling_down: allMsisdns.filter(m => m.status === "cooling_down").length,
            by_tier: {
                standard: allMsisdns.filter(m => m.tier === "standard").length,
                gold: allMsisdns.filter(m => m.tier === "gold").length,
                platinum: allMsisdns.filter(m => m.tier === "platinum").length
            },
            by_region: allMsisdns.reduce((acc: any, m) => {
                acc[m.region_code] = (acc[m.region_code] || 0) + 1
                return acc
            }, {})
        }

        // Calculate utilization
        const utilization = {
            total_capacity: allMsisdns.length,
            in_use: stats.active + stats.reserved,
            utilization_percentage: allMsisdns.length > 0
                ? Math.round(((stats.active + stats.reserved) / allMsisdns.length) * 100)
                : 0
        }

        return res.json({
            msisdns: msisdns.map(m => ({
                id: m.id,
                phone_number: m.phone_number,
                status: m.status,
                tier: m.tier,
                region_code: m.region_code,
                created_at: m.created_at,
                updated_at: m.updated_at
            })),
            statistics: stats,
            utilization,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                total: msisdns.length
            }
        })

    } catch (error) {
        console.error("[MSISDN Inventory] Error:", error)
        return res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to fetch MSISDN inventory"
        })
    }
}

/**
 * Admin API: Update MSISDN
 * PATCH /admin/telecom/msisdn-inventory/:id
 */
export async function PATCH(
    req: MedusaRequest<{ id: string }>,
    res: MedusaResponse
) {
    const { id } = req.params
    const telecomModule: TelecomCoreModuleService = req.scope.resolve("telecom")

    try {
        const { status, tier, region_code } = req.body as any

        const updateData: any = {}
        if (status) updateData.status = status
        if (tier) updateData.tier = tier
        if (region_code) updateData.region_code = region_code

        await telecomModule.updateMsisdnInventories({
            id,
            ...updateData
        })

        const [updated] = await telecomModule.listMsisdnInventories({ id })

        return res.json({
            msisdn: updated,
            message: "MSISDN updated successfully"
        })

    } catch (error) {
        console.error("[MSISDN Update] Error:", error)
        return res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to update MSISDN"
        })
    }
}

/**
 * Admin API: Bulk Import MSISDNs
 * POST /admin/telecom/msisdn-inventory/bulk-import
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
    const telecomModule: TelecomCoreModuleService = req.scope.resolve("telecom")

    try {
        const { msisdns } = req.body as {
            msisdns: Array<{
                phone_number: string
                tier?: string
                region_code?: string
            }>
        }

        if (!msisdns || !Array.isArray(msisdns)) {
            return res.status(400).json({ error: "Invalid input: msisdns array required" })
        }

        const created = []
        const errors = []

        for (const msisdn of msisdns) {
            try {
                const newMsisdn = await telecomModule.createMsisdnInventories({
                    phone_number: msisdn.phone_number,
                    status: "available",
                    tier: msisdn.tier || "standard",
                    region_code: msisdn.region_code || "DEFAULT"
                })
                created.push(newMsisdn)
            } catch (error) {
                errors.push({
                    phone_number: msisdn.phone_number,
                    error: error instanceof Error ? error.message : "Unknown error"
                })
            }
        }

        return res.json({
            success: created.length,
            failed: errors.length,
            created,
            errors
        })

    } catch (error) {
        console.error("[MSISDN Bulk Import] Error:", error)
        return res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to import MSISDNs"
        })
    }
}
