import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import TelecomCoreModuleService from "@modules/telecom-core/service"

export type ActivateInventoryInput = {
    validated_items: Array<{
        msisdn_id: string
        phone_number: string
    }>
}

/**
 * Step 4: Activate Inventory
 * Updates MSISDN status from 'reserved' to 'active'
 */
export const activateInventoryStep = createStep(
    "activate-inventory",
    async (input: ActivateInventoryInput, { container }) => {
        const telecomService: TelecomCoreModuleService = container.resolve("telecom")

        for (const item of input.validated_items) {
            await telecomService.updateMsisdnInventories([
                {
                    id: item.msisdn_id,
                    status: "active",
                },
            ])

            console.log(
                `[Activate Inventory] Activated phone number ${item.phone_number} (ID: ${item.msisdn_id})`
            )
        }

        return new StepResponse({
            activated_count: input.validated_items.length,
        })
    }
)
