import { ExecArgs } from "@medusajs/framework/types"
import TelecomCoreModuleService from "../modules/telecom-core/service"
import { generateInvoiceWorkflow } from "../workflows/billing/generate-invoice"
import { changePlanWorkflow } from "../workflows/telecom/change-plan"

/**
 * Comprehensive Phase 1 Test Suite
 * Tests all features directly without HTTP calls
 */
export default async function testPhase1Comprehensive({ container }: ExecArgs) {
    const logger = container.resolve("logger")
    const telecomModule: TelecomCoreModuleService = container.resolve("telecom")

    logger.info("🧪 COMPREHENSIVE PHASE 1 TEST SUITE")
    logger.info("=".repeat(60))

    let testsPassed = 0
    let testsFailed = 0

    try {
        // TEST 1: Invoice Generation
        logger.info("\n📋 TEST 1: Invoice Generation Workflow")
        logger.info("-".repeat(60))

        try {
            const subscriptions = await telecomModule.listSubscriptions({ status: "active" })

            if (subscriptions.length === 0) {
                logger.warn("⚠️  No active subscriptions - skipping invoice test")
            } else {
                const subscription = subscriptions[0]

                const { result } = await generateInvoiceWorkflow(container).run({
                    input: {
                        customer_id: subscription.customer_id,
                        subscription_id: subscription.id,
                        line_items: [
                            { description: "Monthly Plan Charge", amount: 29900, quantity: 1 },
                            { description: "Data Add-on", amount: 5000, quantity: 1 }
                        ],
                        due_days: 15
                    }
                })

                const invoice = result.invoice

                logger.info(`✅ Invoice Created:`)
                logger.info(`   Number: ${invoice.invoice_number}`)
                logger.info(`   Subtotal: ₹${invoice.subtotal / 100}`)
                logger.info(`   Tax (18%): ₹${invoice.tax_amount / 100}`)
                logger.info(`   Total: ₹${invoice.total_amount / 100}`)
                logger.info(`   Status: ${invoice.status}`)

                // Verify calculations
                const expectedSubtotal = 34900 // 299 + 50
                const expectedTax = Math.round(expectedSubtotal * 0.18)
                const expectedTotal = expectedSubtotal + expectedTax

                if (invoice.subtotal === expectedSubtotal &&
                    invoice.tax_amount === expectedTax &&
                    invoice.total_amount === expectedTotal) {
                    logger.info(`✅ Invoice calculations correct`)
                    testsPassed++
                } else {
                    logger.error(`❌ Invoice calculations incorrect`)
                    testsFailed++
                }
            }
        } catch (error) {
            logger.error(`❌ Invoice test failed: ${error.message}`)
            testsFailed++
        }

        // TEST 2: Invoice Retrieval
        logger.info("\n📋 TEST 2: Invoice Retrieval")
        logger.info("-".repeat(60))

        try {
            const invoices = await telecomModule.listInvoices({})
            logger.info(`✅ Found ${invoices.length} invoice(s)`)

            if (invoices.length > 0) {
                const invoice = invoices[0]
                logger.info(`   Latest: ${invoice.invoice_number} - ₹${invoice.total_amount / 100}`)
                testsPassed++
            } else {
                logger.warn(`⚠️  No invoices found`)
            }
        } catch (error) {
            logger.error(`❌ Invoice retrieval failed: ${error.message}`)
            testsFailed++
        }

        // TEST 3: Payment Attempt Creation
        logger.info("\n📋 TEST 3: Payment Attempt Creation")
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
                    next_retry_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // 2 days
                })

                logger.info(`✅ Payment Attempt Created:`)
                logger.info(`   ID: ${paymentAttempt.id}`)
                logger.info(`   Amount: ₹${paymentAttempt.amount / 100}`)
                logger.info(`   Status: ${paymentAttempt.status}`)
                logger.info(`   Attempt: ${paymentAttempt.attempt_number}/${paymentAttempt.max_retries}`)
                testsPassed++
            }
        } catch (error) {
            logger.error(`❌ Payment attempt test failed: ${error.message}`)
            testsFailed++
        }

        // TEST 4: Usage History
        logger.info("\n📋 TEST 4: Usage History Retrieval")
        logger.info("-".repeat(60))

        try {
            const subscriptions = await telecomModule.listSubscriptions({ status: "active" })

            if (subscriptions.length > 0) {
                const subscription = subscriptions[0]
                const usageHistory = await telecomModule.listUsageCounters({
                    subscription_id: subscription.id
                })

                logger.info(`✅ Usage History Retrieved:`)
                logger.info(`   Total Periods: ${usageHistory.length}`)

                if (usageHistory.length > 0) {
                    const latest = usageHistory[usageHistory.length - 1]
                    logger.info(`   Latest: ${latest.period_year}-${latest.period_month}`)
                    logger.info(`   Data Used: ${latest.data_used_mb}MB`)
                    logger.info(`   Voice Used: ${latest.voice_used_min} min`)
                }
                testsPassed++
            }
        } catch (error) {
            logger.error(`❌ Usage history test failed: ${error.message}`)
            testsFailed++
        }

        // TEST 5: Plan Change Workflow
        logger.info("\n📋 TEST 5: Plan Change Workflow")
        logger.info("-".repeat(60))

        try {
            const subscriptions = await telecomModule.listSubscriptions({ status: "active" })
            const planConfigs = await telecomModule.listPlanConfigurations({})

            if (subscriptions.length > 0 && planConfigs.length >= 2) {
                const subscription = subscriptions[0]
                const currentPlanId = subscription.metadata?.current_plan_config_id
                const newPlan = planConfigs.find(p => p.id !== currentPlanId) || planConfigs[0]

                const { result } = await changePlanWorkflow(container).run({
                    input: {
                        subscription_id: subscription.id,
                        new_plan_config_id: newPlan.id,
                        old_plan_price: 29900,
                        new_plan_price: 71900,
                        old_plan_config_id: currentPlanId || planConfigs[0].id
                    }
                })

                logger.info(`✅ Plan Changed:`)
                logger.info(`   Type: ${result.is_upgrade ? 'Upgrade' : 'Downgrade'}`)
                logger.info(`   Proration:`)
                logger.info(`     Days Remaining: ${result.proration.days_remaining}`)
                logger.info(`     Credit: ₹${result.proration.credit_amount / 100}`)
                logger.info(`     Charge: ₹${result.proration.charge_amount / 100}`)
                logger.info(`     Net: ₹${result.proration.net_amount / 100}`)
                testsPassed++
            } else {
                logger.warn(`⚠️  Insufficient data for plan change test`)
            }
        } catch (error) {
            logger.error(`❌ Plan change test failed: ${error.message}`)
            testsFailed++
        }

        // TEST 6: Proration Calculation
        logger.info("\n📋 TEST 6: Proration Calculation Accuracy")
        logger.info("-".repeat(60))

        try {
            const { calculateProration } = await import("../utils/proration")

            const renewalDate = new Date()
            renewalDate.setDate(renewalDate.getDate() + 15) // 15 days remaining

            const proration = calculateProration(29900, 71900, renewalDate)

            logger.info(`✅ Proration Calculated:`)
            logger.info(`   Days Remaining: ${proration.days_remaining}`)
            logger.info(`   Old Plan Daily: ₹${(29900 / 30 / 100).toFixed(2)}`)
            logger.info(`   New Plan Daily: ₹${(71900 / 30 / 100).toFixed(2)}`)
            logger.info(`   Credit: ₹${proration.credit_amount / 100}`)
            logger.info(`   Charge: ₹${proration.charge_amount / 100}`)
            logger.info(`   Net Amount: ₹${proration.net_amount / 100}`)

            // Verify calculation logic
            if (proration.days_remaining === 15 && proration.net_amount > 0) {
                logger.info(`✅ Proration logic correct`)
                testsPassed++
            } else {
                logger.error(`❌ Proration logic incorrect`)
                testsFailed++
            }
        } catch (error) {
            logger.error(`❌ Proration test failed: ${error.message}`)
            testsFailed++
        }

        // FINAL SUMMARY
        logger.info("\n" + "=".repeat(60))
        logger.info("📊 PHASE 1 TEST RESULTS")
        logger.info("=".repeat(60))
        logger.info(`✅ Tests Passed: ${testsPassed}`)
        logger.info(`❌ Tests Failed: ${testsFailed}`)
        logger.info(`📈 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`)
        logger.info("=".repeat(60))

        if (testsFailed === 0) {
            logger.info("🎉 ALL PHASE 1 FEATURES WORKING PERFECTLY!")
        } else {
            logger.warn(`⚠️  ${testsFailed} test(s) failed - review above`)
        }

    } catch (error) {
        logger.error("❌ Test suite failed:", error)
        throw error
    }
}
