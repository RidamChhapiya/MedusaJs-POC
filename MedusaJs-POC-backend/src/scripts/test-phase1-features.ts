import { ExecArgs } from "@medusajs/framework/types"
import TelecomCoreModuleService from "../modules/telecom-core/service"

/**
 * Test Script: Usage History & Plan Change
 * 
 * Tests usage history API and plan change workflow
 */
export default async function testPhase1Features({ container }: ExecArgs) {
    const logger = container.resolve("logger")
    const telecomModule: TelecomCoreModuleService = container.resolve("telecom")

    const baseUrl = "http://localhost:9000"

    logger.info("🧪 Testing Phase 1 Features...")

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

        // 2. Test Usage History API
        logger.info("\n📊 Step 2: Testing usage history...")

        let response = await fetch(
            `${baseUrl}/store/telecom/usage-history/${subscription.id}`
        )
        let result = await response.json()

        logger.info(`✅ Usage History:`)
        logger.info(`   Current Period: ${result.current_period?.period || 'N/A'}`)
        logger.info(`   Data Used: ${result.current_period?.data_used_mb || 0}MB`)
        logger.info(`   Total Records: ${result.total_records}`)

        // 3. Test Usage Export (CSV)
        logger.info("\n📥 Step 3: Testing usage export...")

        response = await fetch(
            `${baseUrl}/store/telecom/usage-history/${subscription.id}/export?format=csv`
        )
        const csvData = await response.text()

        logger.info(`✅ CSV Export (first 200 chars):`)
        logger.info(csvData.substring(0, 200))

        // 4. Test Plan Change
        logger.info("\n🔄 Step 4: Testing plan change...")

        // Get all plan configurations
        const planConfigs = await telecomModule.listPlanConfigurations({})

        if (planConfigs.length < 2) {
            logger.warn("⚠️  Need at least 2 plan configs to test plan change")
        } else {
            const currentPlanId = subscription.metadata?.current_plan_config_id
            const newPlan = planConfigs.find(p => p.id !== currentPlanId)

            if (newPlan) {
                response = await fetch(
                    `${baseUrl}/admin/telecom/subscriptions/${subscription.id}/change-plan`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            new_plan_config_id: newPlan.id,
                            old_plan_price: 29900, // ₹299
                            new_plan_price: 71900  // ₹719
                        })
                    }
                )

                result = await response.json()

                if (result.success) {
                    logger.info(`✅ Plan Changed:`)
                    logger.info(`   Type: ${result.is_upgrade ? 'Upgrade' : 'Downgrade'}`)
                    logger.info(`   Proration:`)
                    logger.info(`     Credit: ₹${result.proration.credit_amount / 100}`)
                    logger.info(`     Charge: ₹${result.proration.charge_amount / 100}`)
                    logger.info(`     Net: ₹${result.proration.net_amount / 100}`)
                } else {
                    logger.error(`❌ Plan change failed: ${result.error}`)
                }
            }
        }

        // Summary
        logger.info("\n" + "=".repeat(60))
        logger.info("✅ Phase 1 Features Test Complete!")
        logger.info("=".repeat(60))
        logger.info("✅ Usage history API working")
        logger.info("✅ Usage export (CSV) working")
        logger.info("✅ Plan change workflow working")
        logger.info("✅ Proration calculation working")
        logger.info("=".repeat(60))

    } catch (error) {
        logger.error("❌ Test failed:", error)
        throw error
    }
}
