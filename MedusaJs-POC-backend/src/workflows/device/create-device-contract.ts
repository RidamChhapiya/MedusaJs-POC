import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import TelecomCoreModuleService from "../../modules/telecom-core/service"
import { Modules } from "@medusajs/framework/utils"

/**
 * Step: Calculate Installment Details
 */
const calculateInstallmentStep = createStep(
    "calculate-installment",
    async ({ device_price, down_payment, installment_count }: any) => {
        const remainingAmount = device_price - down_payment
        const installmentAmount = Math.round(remainingAmount / installment_count)

        // Calculate early termination fee (remaining balance + 20% penalty)
        const earlyTerminationFee = Math.round(remainingAmount * 1.2)

        console.log(`[Device Contract] Installment: ₹${installmentAmount / 100} x ${installment_count}`)

        return new StepResponse({
            installment_amount: installmentAmount,
            early_termination_fee: earlyTerminationFee
        })
    }
)

/**
 * Step: Create Device Contract
 */
const createDeviceContractStep = createStep(
    "create-device-contract",
    async ({
        subscription_id,
        device_product_id,
        customer_id,
        device_price,
        down_payment,
        installment_amount,
        installment_count,
        early_termination_fee
    }: any, { container }) => {
        const telecomModule: TelecomCoreModuleService = container.resolve("telecom")

        const now = new Date()
        const contractEndDate = new Date(now)
        contractEndDate.setMonth(contractEndDate.getMonth() + installment_count)

        const nextPaymentDate = new Date(now)
        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1)

        const contract = await telecomModule.createDeviceContracts({
            subscription_id,
            device_product_id,
            customer_id,
            device_price,
            down_payment,
            installment_amount,
            installment_count,
            installments_paid: 0,
            contract_start_date: now,
            contract_end_date: contractEndDate,
            next_payment_date: nextPaymentDate,
            status: "active",
            early_termination_fee
        })

        console.log(`[Device Contract] Created: ${contract.id}`)

        return new StepResponse(contract, contract.id)
    },
    async (contractId, { container }) => {
        // Compensation: Delete contract
        if (contractId) {
            const telecomModule: TelecomCoreModuleService = container.resolve("telecom")
            await telecomModule.deleteDeviceContracts([contractId])
            console.log(`[Device Contract] Deleted: ${contractId}`)
        }
    }
)

/**
 * Step: Emit Contract Created Event
 */
const emitContractCreatedEventStep = createStep(
    "emit-contract-created-event",
    async ({ contract }: any, { container }) => {
        const eventBus = container.resolve(Modules.EVENT_BUS)

        await eventBus.emit("telecom.device_contract.created", {
            contract_id: contract.id,
            subscription_id: contract.subscription_id,
            device_price: contract.device_price,
            installment_count: contract.installment_count
        })

        console.log(`[Device Contract] Emitted created event`)

        return new StepResponse({ success: true })
    }
)

/**
 * Workflow: Create Device Contract
 */
export const createDeviceContractWorkflow = createWorkflow(
    "create-device-contract-workflow",
    (input: {
        subscription_id: string
        device_product_id: string
        customer_id: string
        device_price: number
        down_payment: number
        installment_count: number
    }) => {
        // Step 1: Calculate installments
        const { installment_amount, early_termination_fee } = calculateInstallmentStep({
            device_price: input.device_price,
            down_payment: input.down_payment,
            installment_count: input.installment_count
        })

        // Step 2: Create contract
        const contract = createDeviceContractStep({
            subscription_id: input.subscription_id,
            device_product_id: input.device_product_id,
            customer_id: input.customer_id,
            device_price: input.device_price,
            down_payment: input.down_payment,
            installment_amount,
            installment_count: input.installment_count,
            early_termination_fee
        })

        // Step 3: Emit event
        emitContractCreatedEventStep({ contract })

        return new WorkflowResponse({
            contract,
            installment_amount,
            early_termination_fee
        })
    }
)
