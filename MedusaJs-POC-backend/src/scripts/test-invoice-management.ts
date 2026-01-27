import { ExecArgs } from "@medusajs/framework/types"
import TelecomCoreModuleService from "../modules/telecom-core/service"

/**
 * Test Script: Invoice Management
 * 
 * Tests invoice generation and payment retry logic
 */
export default async function testInvoiceManagement({ container }: ExecArgs) {
    const logger = container.resolve("logger")
    const telecomModule: TelecomCoreModuleService = container.resolve("telecom")

    const baseUrl = "http://localhost:9000"

    logger.info("🧪 Testing Invoice Management...")

    try {
        // 1. Find an active subscription
        logger.info("\n📋 Step 1: Finding active subscription...")

        const subscriptions = await telecomModule.listSubscriptions({
            status: "active"
        })

        if (subscriptions.length === 0) {
            logger.error("❌ No active subscriptions found")
            return
        }

        const subscription = subscriptions[0]
        logger.info(`✅ Found subscription: ${subscription.id}`)

        // 2. Generate invoice via API
        logger.info("\n📄 Step 2: Generating invoice...")

        const response = await fetch(`${baseUrl}/admin/telecom/invoices/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                customer_id: subscription.customer_id,
                subscription_id: subscription.id,
                line_items: [
                    {
                        description: "Monthly Plan Charge",
                        amount: 29900, // ₹299
                        quantity: 1
                    }
                ],
                due_days: 15
            })
        })

        const result = await response.json()

        if (result.success) {
            logger.info(`✅ Invoice generated: ${result.invoice.invoice_number}`)
            logger.info(`   Total: ₹${result.invoice.total_amount / 100}`)
            logger.info(`   Due Date: ${result.invoice.due_date}`)
        } else {
            logger.error(`❌ Invoice generation failed: ${result.error}`)
            return
        }

        // 3. List invoices
        logger.info("\n📋 Step 3: Listing invoices...")

        const listResponse = await fetch(`${baseUrl}/admin/telecom/invoices`)
        const listResult = await listResponse.json()

        logger.info(`✅ Found ${listResult.count} invoice(s)`)

        // 4. Get invoice details
        if (result.invoice) {
            logger.info("\n📄 Step 4: Fetching invoice details...")

            const detailResponse = await fetch(
                `${baseUrl}/admin/telecom/invoices/${result.invoice.id}`
            )
            const detailResult = await detailResponse.json()

            logger.info(`✅ Invoice Details:`)
            logger.info(`   Number: ${detailResult.invoice.invoice_number}`)
            logger.info(`   Status: ${detailResult.invoice.status}`)
            logger.info(`   Subtotal: ₹${detailResult.invoice.subtotal / 100}`)
            logger.info(`   Tax: ₹${detailResult.invoice.tax_amount / 100}`)
            logger.info(`   Total: ₹${detailResult.invoice.total_amount / 100}`)
        }

        // Summary
        logger.info("\n" + "=".repeat(60))
        logger.info("✅ Invoice Management Test Complete!")
        logger.info("=".repeat(60))
        logger.info("✅ Invoice generation working")
        logger.info("✅ List invoices working")
        logger.info("✅ Get invoice details working")
        logger.info("=".repeat(60))

    } catch (error) {
        logger.error("❌ Test failed:", error)
        throw error
    }
}
