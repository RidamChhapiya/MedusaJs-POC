import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import TelecomCoreModuleService from "@modules/telecom-core/service"

/**
 * Admin API: Create Roaming Package
 * POST /admin/telecom/roaming-packages
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
    const telecomModule: TelecomCoreModuleService = req.scope.resolve("telecom")

    const {
        subscription_id,
        package_type,
        destination_country,
        data_quota_mb = 0,
        voice_quota_min = 0,
        price,
        validity_days
    } = req.body as any

    try {
        const activationDate = new Date()
        const expiryDate = new Date(activationDate)
        expiryDate.setDate(expiryDate.getDate() + validity_days)

        const roamingPackage = await telecomModule.createRoamingPackages({
            subscription_id,
            package_type,
            destination_country,
            data_quota_mb,
            voice_quota_min,
            price,
            validity_days,
            activation_date: activationDate,
            expiry_date: expiryDate,
            status: "active"
        })

        return res.json({
            success: true,
            roaming_package: roamingPackage,
            message: `Roaming package activated for ${destination_country}, valid until ${expiryDate.toDateString()}`
        })
    } catch (error) {
        return res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to create roaming package"
        })
    }
}

/**
 * Admin API: List Roaming Packages
 * GET /admin/telecom/roaming-packages
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const telecomModule: TelecomCoreModuleService = req.scope.resolve("telecom")
    const { subscription_id, status } = req.query as any

    try {
        const filters: any = {}
        if (subscription_id) filters.subscription_id = subscription_id
        if (status) filters.status = status

        const packages = await telecomModule.listRoamingPackages(filters)

        return res.json({
            roaming_packages: packages,
            count: packages.length
        })
    } catch (error) {
        return res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to list roaming packages"
        })
    }
}
