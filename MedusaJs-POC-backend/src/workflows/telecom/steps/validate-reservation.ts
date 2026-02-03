import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import TelecomCoreModuleService from "@modules/telecom-core/service"

export type ValidateReservationInput = {
    plan_items: Array<{
        line_item_id: string
        allocated_number?: string
    }>
}

export type ValidateReservationOutput = {
    validated_items: Array<{
        line_item_id: string
        msisdn_id: string
        phone_number: string
    }>
}

/**
 * Step 2: Validate Reservations
 * Checks that allocated numbers exist and are in 'reserved' status
 */
export const validateReservationStep = createStep(
    "validate-reservation",
    async (input: ValidateReservationInput, { container }) => {
        console.log("🔍 [Workflow Step 2] Validating Reservations...")
        console.log("🔍 [Workflow Step 2] Plan items to validate:", input.plan_items.length)

        const telecomService: TelecomCoreModuleService = container.resolve("telecom")

        const validatedItems: { line_item_id: string; msisdn_id: string; phone_number: string }[] = []

        for (const item of input.plan_items) {
            console.log(`🔍 [Workflow Step 2] Validating item:`, item.line_item_id)
            console.log(`   - Allocated number:`, item.allocated_number)

            if (!item.allocated_number) {
                console.error(`❌ [Workflow Step 2] No allocated number for item ${item.line_item_id}`)
                throw new Error(
                    `Line item ${item.line_item_id} does not have an allocated phone number`
                )
            }

            // Find the number in inventory
            const numbers = await telecomService.listMsisdnInventories({
                phone_number: item.allocated_number,
            })

            console.log(`🔍 [Workflow Step 2] Found ${numbers?.length || 0} matching numbers in inventory`)

            if (!numbers || numbers.length === 0) {
                console.error(`❌ [Workflow Step 2] Number not found in inventory: ${item.allocated_number}`)
                throw new Error(
                    `Phone number ${item.allocated_number} not found in inventory`
                )
            }

            const msisdn = numbers[0]
            console.log(`🔍 [Workflow Step 2] MSISDN status:`, msisdn.status)

            // Validate it's reserved
            if (msisdn.status !== "reserved") {
                console.error(`❌ [Workflow Step 2] Number not reserved: ${item.allocated_number} (status: ${msisdn.status})`)
                throw new Error(
                    `Phone number ${item.allocated_number} is not reserved (current status: ${msisdn.status})`
                )
            }

            console.log(`✅ [Workflow Step 2] Validated: ${item.allocated_number}`)

            validatedItems.push({
                line_item_id: item.line_item_id,
                msisdn_id: msisdn.id,
                phone_number: msisdn.phone_number,
            })
        }

        console.log(`✅ [Workflow Step 2] All ${validatedItems.length} items validated`)

        return new StepResponse({
            validated_items: validatedItems,
        })
    }
)
