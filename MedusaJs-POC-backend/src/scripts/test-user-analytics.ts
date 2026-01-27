import { ExecArgs } from "@medusajs/framework/types"

/**
 * Test script to demonstrate the User Analytics Dashboard APIs
 */
export default async function testUserAnalytics({ container }: ExecArgs) {
    const logger = container.resolve("logger")

    logger.info("🧪 TESTING USER ANALYTICS DASHBOARD")
    logger.info("=".repeat(70))

    try {
        // Simulate API calls by directly calling the logic
        const telecomModule = container.resolve("telecom")

        logger.info("\n📊 TEST 1: Fetching User Analytics Overview")
        logger.info("-".repeat(70))

        // Get all subscriptions
        const subscriptions = await telecomModule.listSubscriptions({})

        logger.info(`✅ Found ${subscriptions.length} total subscriptions`)

        if (subscriptions.length > 0) {
            const sub = subscriptions[0]

            // Get MSISDN
            let phoneNumber = "N/A"
            if (sub.msisdn_id) {
                const [msisdn] = await telecomModule.listMsisdnInventories({ id: sub.msisdn_id })
                if (msisdn) phoneNumber = msisdn.phone_number
            }

            // Get usage
            const currentDate = new Date()
            const [currentUsage] = await telecomModule.listUsageCounters({
                subscription_id: sub.id,
                period_month: currentDate.getMonth() + 1,
                period_year: currentDate.getFullYear()
            })

            // Get invoices
            const invoices = await telecomModule.listInvoices({ subscription_id: sub.id })
            const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total_amount, 0)

            logger.info(`\n📱 Sample User Data:`)
            logger.info(`   Phone: ${phoneNumber}`)
            logger.info(`   Status: ${sub.status}`)
            logger.info(`   Data Usage: ${currentUsage?.data_used_mb || 0} MB`)
            logger.info(`   Voice Usage: ${currentUsage?.voice_used_min || 0} min`)
            logger.info(`   Total Revenue: ₹${(totalRevenue / 100).toFixed(2)}`)
            logger.info(`   Total Invoices: ${invoices.length}`)

            logger.info("\n📊 TEST 2: User Deep Dive")
            logger.info("-".repeat(70))

            // Get all usage history
            const usageHistory = await telecomModule.listUsageCounters({
                subscription_id: sub.id
            })

            const totalDataUsed = usageHistory.reduce((sum, u) => sum + (u.data_used_mb || 0), 0)
            const totalVoiceUsed = usageHistory.reduce((sum, u) => sum + (u.voice_used_min || 0), 0)

            logger.info(`\n📈 Usage Statistics:`)
            logger.info(`   Total Data: ${(totalDataUsed / 1024).toFixed(2)} GB`)
            logger.info(`   Total Voice: ${totalVoiceUsed} minutes`)
            logger.info(`   Months Active: ${usageHistory.length}`)
            logger.info(`   Avg Data/Month: ${usageHistory.length > 0 ? Math.round(totalDataUsed / usageHistory.length) : 0} MB`)

            // Get device contracts
            const deviceContracts = await telecomModule.listDeviceContracts({
                subscription_id: sub.id
            })

            logger.info(`\n📱 Services:`)
            logger.info(`   Device Contracts: ${deviceContracts.length}`)

            if (deviceContracts.length > 0) {
                const contract = deviceContracts[0]
                logger.info(`   └─ Device Price: ₹${(contract.device_price / 100).toFixed(2)}`)
                logger.info(`   └─ Installments: ${contract.installments_paid || 0}/${contract.installment_count} paid`)
                logger.info(`   └─ Remaining: ₹${(((contract.installment_count - (contract.installments_paid || 0)) * contract.installment_amount) / 100).toFixed(2)}`)
            }

            // Get family plan
            const familyMembers = await telecomModule.listFamilyMembers({
                subscription_id: sub.id
            })

            if (familyMembers.length > 0) {
                const member = familyMembers[0]
                const [familyPlan] = await telecomModule.listFamilyPlans({ id: member.family_plan_id })

                if (familyPlan) {
                    logger.info(`   Family Plan: ${familyPlan.plan_name}`)
                    logger.info(`   └─ Members: ${familyPlan.current_members}/${familyPlan.max_members}`)
                    logger.info(`   └─ Type: ${member.member_type}`)
                }
            }

            // Calculate insights
            logger.info(`\n🎯 Behavioral Insights:`)

            const avgDataUsage = usageHistory.length > 0
                ? totalDataUsed / usageHistory.length
                : 0

            let usagePattern = "light"
            if (avgDataUsage > 30000) usagePattern = "heavy"
            else if (avgDataUsage > 10000) usagePattern = "moderate"

            let customerSegment = "standard"
            if (totalRevenue > 1000000) customerSegment = "premium"
            else if (totalRevenue > 500000) customerSegment = "high-value"
            else if (totalRevenue > 200000) customerSegment = "mid-tier"

            const paidInvoices = invoices.filter(inv => inv.status === "paid").length
            const paymentRate = invoices.length > 0 ? (paidInvoices / invoices.length) * 100 : 100

            logger.info(`   Segment: ${customerSegment}`)
            logger.info(`   Usage Pattern: ${usagePattern}`)
            logger.info(`   Payment Rate: ${paymentRate.toFixed(1)}%`)
            logger.info(`   Churn Risk: ${sub.status === "active" && paymentRate > 70 ? "low" : "medium"}`)

            // Upsell opportunities
            logger.info(`\n💡 Upsell Opportunities:`)
            if (deviceContracts.length === 0) {
                logger.info(`   • Device financing available`)
            }
            if (avgDataUsage > 40000) {
                logger.info(`   • Upgrade to unlimited plan`)
            }
            if (familyMembers.length === 0 && totalRevenue > 300000) {
                logger.info(`   • Family plan eligible`)
            }
        }

        logger.info("\n" + "=".repeat(70))
        logger.info("✅ USER ANALYTICS DASHBOARD TEST COMPLETE")
        logger.info("=".repeat(70))

        logger.info("\n📌 API Endpoints Created:")
        logger.info("   GET /admin/telecom/user-analytics")
        logger.info("   GET /admin/telecom/user-analytics/:subscription_id")

        logger.info("\n📊 Features Available:")
        logger.info("   ✅ User overview with filtering & sorting")
        logger.info("   ✅ Revenue metrics & LTV calculation")
        logger.info("   ✅ Usage patterns & trends")
        logger.info("   ✅ Risk assessment & scoring")
        logger.info("   ✅ Behavioral insights")
        logger.info("   ✅ Upsell recommendations")
        logger.info("   ✅ Complete user timeline")
        logger.info("   ✅ Payment behavior analysis")

    } catch (error) {
        logger.error("❌ Test failed:", error)
        throw error
    }
}
