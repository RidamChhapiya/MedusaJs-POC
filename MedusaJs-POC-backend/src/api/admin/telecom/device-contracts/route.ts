import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { createDeviceContractWorkflow } from "../../../../workflows/device/create-device-contract"
import type TelecomCoreModuleService from "@modules/telecom-core/service"

/**
 * Admin API: Create Device Contract
 * 
 * POST /admin/telecom/device-contracts
 */
export async function POST(
    req: MedusaRequest,
    res: MedusaResponse
) {
    const {
        subscription_id,
        device_product_id,
        customer_id,
        device_price,
        down_payment = 0,
        installment_count = 12
    } = req.body as {
        subscription_id: string
        device_product_id: string
        customer_id: string
        device_price: number
        down_payment?: number
        installment_count?: number
    }

    try {
        console.log(`[Admin API] Creating device contract for subscription: ${subscription_id}`)

        const { result } = await createDeviceContractWorkflow(req.scope).run({
            input: {
                subscription_id,
                device_product_id,
                customer_id,
                device_price,
                down_payment,
                installment_count
            }
        })

        return res.json({
            success: true,
            contract: result.contract,
            installment_amount: result.installment_amount,
            early_termination_fee: result.early_termination_fee,
            message: `Contract created with ${installment_count} installments of ₹${result.installment_amount / 100}`
        })

    } catch (error) {
        console.error("[Admin API] Error creating device contract:", error)

        return res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to create device contract"
        })
    }
}

/**
 * Admin API: List Device Contracts
 * 
 * GET /admin/telecom/device-contracts
 */
export async function GET(
    req: MedusaRequest,
    res: MedusaResponse
) {
    const telecomModule = req.scope.resolve("telecom")
    const { subscription_id, status, limit = 20, offset = 0 } = req.query as any

    try {
        const filters: any = {}
        if (subscription_id) filters.subscription_id = subscription_id
        if (status) filters.status = status

        const telecomModuleTyped = telecomModule as TelecomCoreModuleService
        const contracts = await telecomModuleTyped.listDeviceContracts(filters, {
            take: parseInt(limit),
            skip: parseInt(offset)
        })

        return res.json({
            contracts,
            count: contracts.length,
            limit: parseInt(limit),
            offset: parseInt(offset)
        })

    } catch (error) {
        console.error("[Admin API] Error listing device contracts:", error)

        return res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to list device contracts"
        })
    }
}
