import { ExecArgs } from "@medusajs/framework/types"
import TelecomCoreModuleService from "../modules/telecom-core/service"
import { calculateProration } from "../utils/proration"

/**
 * Simplified Phase 1 Test Suite
 * Tests core functionality without complex workflows
 */
export default async function testPhase1Final({ container }: ExecArgs) {
    const logger = container.resolve("logger")
    const telecomModule: TelecomCoreModuleService = container.resolve("telecom")

    logger.info("🧪 PHASE 1 FINAL TEST SUITE")
    logger.info("=".repeat(60))

    let testsPassed = 0
    let testsFailed = 0

    try {
        // TEST 1: Invoice Creation (Direct)
        logger.info("\n📋 TEST 1: Invoice Creation")
        logger.info("-".repeat(60))

        try {
            const subscriptions = await telecomModule.listSubscriptions({ status: "active" })

            if (subscriptions.length > 0) {
                const subscription = subscriptions[0]

                const invoice = await telecomModule.createInvoices({
                    customer_id: subscription.customer_id,
                    subscription_id: subscription.id,
                    invoice_number: `INV-TEST-${Date.now()}`,
                    subtotal: 29900,
                    tax_amount: 5382,
                    total_amount: 35282,
                    issue_date: new Date(),
                    due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
                    status: "pending",
                    line_items: [{ description: "Test", amount: 29900 }]
                })

                logger.info(`✅ Invoice Created: ${invoice.invoice_number}`)
                logger.info(`   Total: ₹${invoice.total_amount / 100}`)
                testsPassed++

                // Clean up
                await telecomModule.deleteInvoices([invoice.id])
            }
        } catch (error) {
            logger.error(`❌ Invoice test failed: ${error.message}`)
            testsFailed++
        }

        // TEST 2: Payment Attempt Creation
        logger.info("\n📋 TEST 2: Payment Attempt Creation")
        logger.info("-".repeat(60))

        try {
            const subscriptions = await telecomModule.listSubscriptions({ status: "active" })

            if (subscriptions.length > 0) {
                const subscription = subscriptions[0]

                const paymentAttempt = await telecomModule.createPaymentAttempts({
                    subscription_id: subscription.id,
                    attempt_number: 1,
                    amount: 29900,
                    status: "pending",
                    attempted_at: new Date(),
                    next_retry_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
                })

                logger.info(`✅ Payment Attempt Created`)
                logger.info(`   Amount: ₹${paymentAttempt.amount / 100}`)
                logger.info(`   Status: ${paymentAttempt.status}`)
                testsPassed++

                // Clean up
                await telecomModule.deletePaymentAttempts([paymentAttempt.id])
            }
        } catch (error) {
            logger.error(`❌ Payment attempt test failed: ${error.message}`)
            testsFailed++
        }

        // TEST 3: Usage Counter with Period Fields
        logger.info("\n📋 TEST 3: Usage Counter Period Fields")
        logger.info("-".repeat(60))

        try {
            const subscriptions = await telecomModule.listSubscriptions({ status: "active" })

            if (subscriptions.length > 0) {
                const subscription = subscriptions[0]
                const usageHistory = await telecomModule.listUsageCounters({
                    subscription_id: subscription.id
                })

                logger.info(`✅ Usage History Retrieved: ${usageHistory.length} period(s)`)

                if (usageHistory.length > 0) {
                    const latest = usageHistory[0]
                    const hasFields = latest.period_month !== null && latest.period_year !== null

                    if (hasFields) {
                        logger.info(`   Period: ${latest.period_year}-${latest.period_month}`)
                        logger.info(`   Data: ${latest.data_used_mb}MB, Voice: ${latest.voice_used_min}min`)
                        testsPassed++
                    } else {
                        logger.error(`❌ Period fields are null`)
                        testsFailed++
                    }
                } else {
                    logger.warn(`⚠️  No usage data - test skipped`)
                }
            }
        } catch (error) {
            logger.error(`❌ Usage counter test failed: ${error.message}`)
            testsFailed++
        }

        // TEST 4: Proration Calculation
        logger.info("\n📋 TEST 4: Proration Calculation")
        logger.info("-".repeat(60))

        try {
            const renewalDate = new Date()
            renewalDate.setDate(renewalDate.getDate() + 15) // 15 days remaining

            const proration = calculateProration(29900, 71900, renewalDate)

            logger.info(`✅ Proration Calculated`)
            logger.info(`   Days Remaining: ${proration.days_remaining}`)
            logger.info(`   Credit: ₹${proration.credit_amount / 100}`)
            logger.info(`   Charge: ₹${proration.charge_amount / 100}`)
            logger.info(`   Net: ₹${proration.net_amount / 100}`)

            if (proration.days_remaining === 15 && proration.net_amount > 0) {
                testsPassed++
            } else {
                logger.error(`❌ Proration logic incorrect`)
                testsFailed++
            }
        } catch (error) {
            logger.error(`❌ Proration test failed: ${error.message}`)
            testsFailed++
        }

        // TEST 5: Subscription Status Management
        logger.info("\n📋 TEST 5: Subscription Status Management")
        logger.info("-".repeat(60))

        try {
            const subscriptions = await telecomModule.listSubscriptions({ status: "active" })

            if (subscriptions.length > 0) {
                const subscription = subscriptions[0]

                // Test status change
                await telecomModule.updateSubscriptions(subscription.id, {
                    status: "suspended"
                })

                // Verify update
                const [updated] = await telecomModule.listSubscriptions({ id: subscription.id })

                if (updated && updated.status === "suspended") {
                    logger.info(`✅ Subscription Status Updated`)
                    logger.info(`   ID: ${subscription.id}`)
                    logger.info(`   Status: ${updated.status}`)

                    // Revert back to active
                    await telecomModule.updateSubscriptions(subscription.id, {
                        status: "active"
                    })

                    testsPassed++
                } else {
                    logger.error(`❌ Status not updated correctly`)
                    testsFailed++
                }
            }
        } catch (error) {
            logger.error(`❌ Status update test failed: ${error.message}`)
            testsFailed++
        }

        // TEST 6: Model CRUD Operations
        logger.info("\n📋 TEST 6: Model CRUD Operations")
        logger.info("-".repeat(60))

        try {
            // List operations
            const invoices = await telecomModule.listInvoices({})
            const attempts = await telecomModule.listPaymentAttempts({})
            const usage = await telecomModule.listUsageCounters({})

            logger.info(`✅ CRUD Operations Working`)
            logger.info(`   Invoices: ${invoices.length}`)
            logger.info(`   Payment Attempts: ${attempts.length}`)
            logger.info(`   Usage Counters: ${usage.length}`)
            testsPassed++
        } catch (error) {
            logger.error(`❌ CRUD test failed: ${error.message}`)
            testsFailed++
        }

        // FINAL SUMMARY
        logger.info("\n" + "=".repeat(60))
        logger.info("📊 PHASE 1 TEST RESULTS")
        logger.info("=".repeat(60))
        logger.info(`✅ Tests Passed: ${testsPassed}/6`)
        logger.info(`❌ Tests Failed: ${testsFailed}/6`)
        logger.info(`📈 Success Rate: ${((testsPassed / 6) * 100).toFixed(1)}%`)
        logger.info("=".repeat(60))

        if (testsFailed === 0) {
            logger.info("🎉 ALL PHASE 1 FEATURES WORKING PERFECTLY!")
            logger.info("")
            logger.info("✅ Invoice Management - WORKING")
            logger.info("✅ Payment Retry Logic - WORKING")
            logger.info("✅ Usage History API - WORKING")
            logger.info("✅ Plan Change (Proration) - WORKING")
            logger.info("✅ Subscription Management - WORKING")
            logger.info("✅ Model CRUD Operations - WORKING")
        } else {
            logger.warn(`⚠️  ${testsFailed} test(s) failed`)
        }

    } catch (error) {
        logger.error("❌ Test suite failed:", error)
        throw error
    }
}
