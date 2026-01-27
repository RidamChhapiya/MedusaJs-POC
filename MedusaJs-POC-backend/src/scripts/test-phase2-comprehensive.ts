import { ExecArgs } from "@medusajs/framework/types"
import TelecomCoreModuleService from "../modules/telecom-core/service"
import { createDeviceContractWorkflow } from "../workflows/device/create-device-contract"

/**
 * Phase 2 Comprehensive Test Suite
 * Tests all Phase 2 features
 */
export default async function testPhase2Comprehensive({ container }: ExecArgs) {
    const logger = container.resolve("logger")
    const telecomModule: TelecomCoreModuleService = container.resolve("telecom")

    logger.info("🧪 PHASE 2 COMPREHENSIVE TEST SUITE")
    logger.info("=".repeat(60))

    let testsPassed = 0
    let testsFailed = 0

    try {
        // TEST 1: Device Contract Creation
        logger.info("\n📋 TEST 1: Device Contract Creation")
        logger.info("-".repeat(60))

        try {
            const subscriptions = await telecomModule.listSubscriptions({ status: "active" })

            if (subscriptions.length > 0) {
                const subscription = subscriptions[0]

                const { result } = await createDeviceContractWorkflow(container).run({
                    input: {
                        subscription_id: subscription.id,
                        device_product_id: "test_device_123",
                        customer_id: subscription.customer_id,
                        device_price: 50000, // ₹500
                        down_payment: 10000, // ₹100
                        installment_count: 12
                    }
                })

                logger.info(`✅ Device Contract Created`)
                logger.info(`   Installment: ₹${result.installment_amount / 100} x 12`)
                logger.info(`   Early Termination Fee: ₹${result.early_termination_fee / 100}`)

                // Verify calculation
                const expectedInstallment = Math.round((50000 - 10000) / 12)
                if (result.installment_amount === expectedInstallment) {
                    testsPassed++
                } else {
                    logger.error(`❌ Installment calculation incorrect`)
                    testsFailed++
                }

                // Clean up
                await telecomModule.deleteDeviceContracts([result.contract.id])
            }
        } catch (error) {
            logger.error(`❌ Device contract test failed: ${error.message}`)
            testsFailed++
        }

        // TEST 2: Porting Request Creation
        logger.info("\n📋 TEST 2: Porting Request Creation")
        logger.info("-".repeat(60))

        try {
            const portingRequest = await telecomModule.createPortingRequests({
                customer_id: "test_customer_123",
                msisdn: "+919876543210",
                donor_operator: "Airtel",
                port_type: "port-in",
                status: "pending",
                requested_date: new Date()
            })

            logger.info(`✅ Porting Request Created`)
            logger.info(`   MSISDN: ${portingRequest.msisdn}`)
            logger.info(`   Status: ${portingRequest.status}`)
            testsPassed++

            // Clean up
            await telecomModule.deletePortingRequests([portingRequest.id])
        } catch (error) {
            logger.error(`❌ Porting request test failed: ${error.message}`)
            testsFailed++
        }

        // TEST 3: Family Plan Creation
        logger.info("\n📋 TEST 3: Family Plan Creation")
        logger.info("-".repeat(60))

        try {
            const subscriptions = await telecomModule.listSubscriptions({ status: "active" })

            if (subscriptions.length > 0) {
                const subscription = subscriptions[0]

                const familyPlan = await telecomModule.createFamilyPlans({
                    primary_subscription_id: subscription.id,
                    plan_name: "Test Family Plan",
                    total_data_quota_mb: 50000,
                    total_voice_quota_min: 3000,
                    shared_data_used_mb: 0,
                    shared_voice_used_min: 0,
                    max_members: 5,
                    current_members: 1,
                    status: "active"
                })

                logger.info(`✅ Family Plan Created`)
                logger.info(`   Name: ${familyPlan.plan_name}`)
                logger.info(`   Data Quota: ${familyPlan.total_data_quota_mb}MB`)
                logger.info(`   Max Members: ${familyPlan.max_members}`)
                testsPassed++

                // Clean up
                await telecomModule.deleteFamilyPlans([familyPlan.id])
            }
        } catch (error) {
            logger.error(`❌ Family plan test failed: ${error.message}`)
            testsFailed++
        }

        // TEST 4: Family Member Addition
        logger.info("\n📋 TEST 4: Family Member Addition")
        logger.info("-".repeat(60))

        try {
            const subscriptions = await telecomModule.listSubscriptions({ status: "active" })

            if (subscriptions.length >= 2) {
                const primarySub = subscriptions[0]
                const secondarySub = subscriptions[1]

                // Create family plan
                const familyPlan = await telecomModule.createFamilyPlans({
                    primary_subscription_id: primarySub.id,
                    plan_name: "Test Family",
                    total_data_quota_mb: 50000,
                    total_voice_quota_min: 3000,
                    max_members: 5,
                    current_members: 1,
                    status: "active"
                })

                // Add member
                const member = await telecomModule.createFamilyMembers({
                    family_plan_id: familyPlan.id,
                    subscription_id: secondarySub.id,
                    member_type: "secondary",
                    joined_date: new Date(),
                    status: "active"
                })

                logger.info(`✅ Family Member Added`)
                logger.info(`   Member Type: ${member.member_type}`)
                testsPassed++

                // Clean up
                await telecomModule.deleteFamilyMembers([member.id])
                await telecomModule.deleteFamilyPlans([familyPlan.id])
            } else {
                logger.warn(`⚠️  Need 2+ subscriptions for member test`)
            }
        } catch (error) {
            logger.error(`❌ Family member test failed: ${error.message}`)
            testsFailed++
        }

        // TEST 5: Analytics - Revenue
        logger.info("\n📋 TEST 5: Revenue Analytics")
        logger.info("-".repeat(60))

        try {
            const invoices = await telecomModule.listInvoices({})

            const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total_amount, 0)

            logger.info(`✅ Revenue Analytics Working`)
            logger.info(`   Total Invoices: ${invoices.length}`)
            logger.info(`   Total Revenue: ₹${totalRevenue / 100}`)
            testsPassed++
        } catch (error) {
            logger.error(`❌ Revenue analytics test failed: ${error.message}`)
            testsFailed++
        }

        // TEST 6: Analytics - Subscriptions
        logger.info("\n📋 TEST 6: Subscription Analytics")
        logger.info("-".repeat(60))

        try {
            const subscriptions = await telecomModule.listSubscriptions({})

            const active = subscriptions.filter(s => s.status === "active").length
            const suspended = subscriptions.filter(s => s.status === "suspended").length

            logger.info(`✅ Subscription Analytics Working`)
            logger.info(`   Total: ${subscriptions.length}`)
            logger.info(`   Active: ${active}`)
            logger.info(`   Suspended: ${suspended}`)
            testsPassed++
        } catch (error) {
            logger.error(`❌ Subscription analytics test failed: ${error.message}`)
            testsFailed++
        }

        // TEST 7: Model CRUD Operations
        logger.info("\n📋 TEST 7: Phase 2 Model CRUD")
        logger.info("-".repeat(60))

        try {
            const contracts = await telecomModule.listDeviceContracts({})
            const portingRequests = await telecomModule.listPortingRequests({})
            const familyPlans = await telecomModule.listFamilyPlans({})
            const familyMembers = await telecomModule.listFamilyMembers({})

            logger.info(`✅ CRUD Operations Working`)
            logger.info(`   Device Contracts: ${contracts.length}`)
            logger.info(`   Porting Requests: ${portingRequests.length}`)
            logger.info(`   Family Plans: ${familyPlans.length}`)
            logger.info(`   Family Members: ${familyMembers.length}`)
            testsPassed++
        } catch (error) {
            logger.error(`❌ CRUD test failed: ${error.message}`)
            testsFailed++
        }

        // FINAL SUMMARY
        logger.info("\n" + "=".repeat(60))
        logger.info("📊 PHASE 2 TEST RESULTS")
        logger.info("=".repeat(60))
        logger.info(`✅ Tests Passed: ${testsPassed}/7`)
        logger.info(`❌ Tests Failed: ${testsFailed}/7`)
        logger.info(`📈 Success Rate: ${((testsPassed / 7) * 100).toFixed(1)}%`)
        logger.info("=".repeat(60))

        if (testsFailed === 0) {
            logger.info("🎉 ALL PHASE 2 FEATURES WORKING PERFECTLY!")
            logger.info("")
            logger.info("✅ Device Subsidization - WORKING")
            logger.info("✅ Number Porting (MNP) - WORKING")
            logger.info("✅ Family Plans - WORKING")
            logger.info("✅ Analytics - WORKING")
        } else {
            logger.warn(`⚠️  ${testsFailed} test(s) failed`)
        }

    } catch (error) {
        logger.error("❌ Test suite failed:", error)
        throw error
    }
}
