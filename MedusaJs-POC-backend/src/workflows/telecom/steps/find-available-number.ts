import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { TELECOM_CORE_MODULE } from "../../../modules/telecom-core"
import TelecomCoreModuleService from "@modules/telecom-core/service"

export type FindNumberInput = {
    region_code?: string
    tier?: string
    specific_number?: string
}

export type FindNumberOutput = {
    id: string
    phone_number: string
}

/**
 * Step 1: Find an available phone number
 * Searches MsisdnInventory for an available number based on filters
 */
export const findAvailableNumberStep = createStep(
    "find-available-number",
    async (input: FindNumberInput, { container }) => {
        const telecomService: TelecomCoreModuleService = container.resolve(TELECOM_CORE_MODULE)

        // Build filters for finding available numbers
        const filters: any = {
            status: "available",
        }

        if (input.specific_number) {
            filters.phone_number = input.specific_number
        }
        if (input.region_code) {
            filters.region_code = input.region_code
        }
        if (input.tier) {
            filters.tier = input.tier
        }

        // Find available numbers
        const numbers = await telecomService.listMsisdnInventories(filters, {
            take: 1,
        })

        if (!numbers || numbers.length === 0) {
            throw new Error(
                input.specific_number
                    ? `Phone number ${input.specific_number} is not available`
                    : `No available phone numbers found for the specified criteria`
            )
        }

        const selectedNumber = numbers[0]

        return new StepResponse(
            {
                id: selectedNumber.id,
                phone_number: selectedNumber.phone_number,
            },
            {
                // Pass the ID to compensation function
                numberId: selectedNumber.id,
            }
        )
    }
)
