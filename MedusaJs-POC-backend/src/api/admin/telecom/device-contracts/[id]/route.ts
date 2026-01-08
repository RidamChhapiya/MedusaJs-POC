import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import TelecomCoreModuleService from "../../../../../modules/telecom-core/service"

/**
 * Admin API: Get Device Contract
 * 
 * GET /admin/telecom/device-contracts/:id
 */
export async function GET(
    req: MedusaRequest<{ id: string }>,
    res: MedusaResponse
) {
    const { id } = req.params
    const telecomModule: TelecomCoreModuleService = req.scope.resolve("telecom")

    try {
        const [contract] = await telecomModule.listDeviceContracts({ id })

        if (!contract) {
            return res.status(404).json({
                error: "Device contract not found"
            })
        }

        // Calculate remaining balance
        const remainingInstallments = contract.installment_count - contract.installments_paid
        const remainingBalance = remainingInstallments * contract.installment_amount

        return res.json({
            contract,
            remaining_installments: remainingInstallments,
            remaining_balance: remainingBalance,
            next_payment_amount: contract.installment_amount,
            next_payment_date: contract.next_payment_date
        })

    } catch (error) {
        console.error("[Admin API] Error fetching device contract:", error)

        return res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to fetch device contract"
        })
    }
}
