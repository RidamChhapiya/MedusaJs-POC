import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { TELECOM_CORE_MODULE } from "../../../modules/telecom-core"
import TelecomCoreModuleService from "@modules/telecom-core/service"

export type LockNumberInput = {
    id: string
    phone_number: string
}

/**
 * Step 2: Lock/Reserve the phone number
 * Updates the status to 'reserved' to prevent others from taking it
 */
export const lockNumberStep = createStep(
    "lock-number",
    async (input: LockNumberInput, { container }) => {
        const telecomService: TelecomCoreModuleService = container.resolve(TELECOM_CORE_MODULE)

        // Update the number status to 'reserved'
        await telecomService.updateMsisdnInventories([
            {
                id: input.id,
                status: "reserved",
            },
        ])

        return new StepResponse(
            {
                id: input.id,
                phone_number: input.phone_number,
            },
            {
                // Pass the ID to compensation function for rollback
                numberId: input.id,
            }
        )
    },
    // Compensation function: rollback to 'available' if workflow fails
    async (compensateInput, { container }) => {
        if (!compensateInput?.numberId) {
            return
        }

        const telecomService: TelecomCoreModuleService = container.resolve(TELECOM_CORE_MODULE)

        // Rollback: set status back to 'available'
        await telecomService.updateMsisdnInventories([
            {
                id: compensateInput.numberId,
                status: "available",
            },
        ])
    }
)
