import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import TelecomCoreModuleService from "@modules/telecom-core/service"
import { Modules } from "@medusajs/framework/utils"

/**
 * Step: Generate Invoice Number
 */
const generateInvoiceNumberStep = createStep(
    "generate-invoice-number",
    async (_, { container }) => {
        const now = new Date()
        const year = now.getFullYear()
        const month = String(now.getMonth() + 1).padStart(2, '0')
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')

        const invoiceNumber = `INV-${year}${month}-${random}`

        return new StepResponse({ invoice_number: invoiceNumber })
    }
)

/**
 * Step: Calculate Invoice Amounts
 */
const calculateInvoiceAmountsStep = createStep(
    "calculate-invoice-amounts",
    async ({ subscription_id, line_items }: any, { container }) => {
        const telecomModule: TelecomCoreModuleService = container.resolve("telecom")

        console.log(`[Invoice] Calculating amounts for subscription: ${subscription_id}`)

        // Calculate subtotal from line items
        let subtotal = 0
        for (const item of line_items) {
            subtotal += item.amount
        }

        // Calculate tax (18% GST for India)
        const taxRate = 0.18
        const taxAmount = Math.round(subtotal * taxRate)

        // Calculate total
        const totalAmount = subtotal + taxAmount

        console.log(`[Invoice] Subtotal: ${subtotal}, Tax: ${taxAmount}, Total: ${totalAmount}`)

        return new StepResponse({
            subtotal,
            tax_amount: taxAmount,
            total_amount: totalAmount
        })
    }
)

/**
 * Step: Create Invoice Record
 */
const createInvoiceRecordStep = createStep(
    "create-invoice-record",
    async ({
        customer_id,
        subscription_id,
        invoice_number,
        subtotal,
        tax_amount,
        total_amount,
        line_items,
        due_days = 15
    }: any, { container }) => {
        const telecomModule: TelecomCoreModuleService = container.resolve("telecom")

        const now = new Date()
        const dueDate = new Date(now)
        dueDate.setDate(dueDate.getDate() + due_days)

        const invoice = await telecomModule.createInvoices({
            customer_id,
            subscription_id,
            invoice_number,
            subtotal,
            tax_amount,
            total_amount,
            issue_date: now,
            due_date: dueDate,
            status: "pending",
            line_items
        })

        console.log(`[Invoice] Created invoice: ${invoice.id} (${invoice_number})`)

        return new StepResponse(invoice, invoice.id)
    },
    async (invoiceId, { container }) => {
        // Compensation: Delete invoice
        if (invoiceId) {
            const telecomModule: TelecomCoreModuleService = container.resolve("telecom")
            await telecomModule.deleteInvoices([invoiceId])
            console.log(`[Invoice] Deleted invoice: ${invoiceId}`)
        }
    }
)

/**
 * Step: Generate PDF (Placeholder)
 */
const generatePdfStep = createStep(
    "generate-pdf",
    async ({ invoice }: any, { container }) => {
        console.log(`[Invoice] PDF generation for ${invoice.invoice_number}`)

        // TODO: Implement actual PDF generation with pdfkit or puppeteer
        // For now, return a placeholder URL
        const pdfUrl = `/invoices/${invoice.id}.pdf`

        return new StepResponse({ pdf_url: pdfUrl })
    }
)

/**
 * Step: Update Invoice with PDF URL
 */
const updateInvoiceWithPdfStep = createStep(
    "update-invoice-with-pdf",
    async ({ invoice_id, pdf_url }: any, { container }) => {
        const telecomModule: TelecomCoreModuleService = container.resolve("telecom")

        const updated = await telecomModule.updateInvoices(invoice_id, {
            pdf_url
        })

        console.log(`[Invoice] Updated with PDF URL: ${pdf_url}`)

        return new StepResponse(updated)
    }
)

/**
 * Step: Emit Invoice Created Event
 */
const emitInvoiceCreatedEventStep = createStep(
    "emit-invoice-created-event",
    async ({ invoice }: any, { container }) => {
        const eventBus = container.resolve(Modules.EVENT_BUS)

        await eventBus.emit("telecom.invoice.created" as any, {
            invoice_id: invoice.id,
            customer_id: invoice.customer_id,
            subscription_id: invoice.subscription_id,
            total_amount: invoice.total_amount,
            due_date: invoice.due_date
        })

        console.log(`[Invoice] Emitted invoice.created event`)

        return new StepResponse({ success: true })
    }
)

/**
 * Workflow: Generate Invoice
 */
export const generateInvoiceWorkflow = createWorkflow(
    "generate-invoice-workflow",
    (input: {
        customer_id: string
        subscription_id: string
        line_items: Array<{
            description: string
            amount: number
            quantity?: number
        }>
        due_days?: number
    }) => {
        // Step 1: Generate invoice number
        const { invoice_number } = generateInvoiceNumberStep()

        // Step 2: Calculate amounts
        const { subtotal, tax_amount, total_amount } = calculateInvoiceAmountsStep({
            subscription_id: input.subscription_id,
            line_items: input.line_items
        })

        // Step 3: Create invoice record
        const invoice = createInvoiceRecordStep({
            customer_id: input.customer_id,
            subscription_id: input.subscription_id,
            invoice_number,
            subtotal,
            tax_amount,
            total_amount,
            line_items: input.line_items,
            due_days: input.due_days
        })

        // Step 4: Generate PDF
        const { pdf_url } = generatePdfStep({ invoice })

        // Step 5: Update invoice with PDF URL
        const updatedInvoice = updateInvoiceWithPdfStep({
            invoice_id: invoice.id,
            pdf_url
        })

        // Step 6: Emit event
        emitInvoiceCreatedEventStep({ invoice: updatedInvoice })

        return new WorkflowResponse({
            invoice: updatedInvoice
        })
    }
)
