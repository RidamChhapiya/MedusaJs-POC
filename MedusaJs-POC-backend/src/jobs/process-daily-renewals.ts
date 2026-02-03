import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { processRenewalWorkflow } from "../workflows/telecom/process-renewal"
import TelecomCoreModuleService from "@modules/telecom-core/service"

/**
 * Daily Renewal Processing Job
 * 
 * Schedule: Runs every day at midnight (0 0 * * *)
 * 
 * Logic:
 * 1. Find all active subscriptions where renewal_date is today or past
 * 2. Trigger processRenewalWorkflow for each subscription
 * 3. Log results
 */
export default async function processDailyRenewals({ container }: { container: any }) {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    const telecomService: TelecomCoreModuleService = container.resolve("telecom")

    logger.info("🔄 [Daily Renewals] Starting daily renewal processing...")

    try {
        // Get today's date at midnight
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        logger.info(`📅 [Daily Renewals] Processing renewals for date: ${today.toISOString()}`)

        // Find all active subscriptions
        const subscriptions = await telecomService.listSubscriptions({
            status: "active"
        })

        logger.info(`📊 [Daily Renewals] Found ${subscriptions.length} active subscriptions`)

        // Filter subscriptions where renewal_date <= today (use end_date if renewal_date not on model)
        const dueForRenewal = subscriptions.filter(sub => {
            const renewalDate = new Date((sub as any).renewal_date ?? sub.end_date)
            renewalDate.setHours(0, 0, 0, 0)
            return renewalDate <= today
        })

        logger.info(`🔔 [Daily Renewals] ${dueForRenewal.length} subscriptions due for renewal`)

        if (dueForRenewal.length === 0) {
            logger.info("✅ [Daily Renewals] No renewals to process today")
            return
        }

        // Process each subscription
        const results = {
            success: 0,
            failed: 0,
            suspended: 0
        }

        for (const subscription of dueForRenewal) {
            try {
                logger.info(`🔄 [Daily Renewals] Processing subscription ${subscription.id}`)

                const { result } = await processRenewalWorkflow(container).run({
                    input: {
                        subscription_id: subscription.id
                    }
                })

                // Check result - prepaid subscriptions may be suspended
                if (result.prepaid_data?.should_suspend) {
                    results.suspended++
                    logger.warn(`⚠️ [Daily Renewals] Subscription ${subscription.id} suspended`)
                } else {
                    results.success++
                    logger.info(`✅ [Daily Renewals] Subscription ${subscription.id} renewed successfully`)
                }

            } catch (error) {
                results.failed++
                logger.error(`❌ [Daily Renewals] Failed to process subscription ${subscription.id}:`, error)
            }
        }

        // Log summary
        logger.info("=".repeat(60))
        logger.info("📊 [Daily Renewals] Processing Summary:")
        logger.info(`   Total processed: ${dueForRenewal.length}`)
        logger.info(`   ✅ Success: ${results.success}`)
        logger.info(`   ⚠️ Suspended: ${results.suspended}`)
        logger.info(`   ❌ Failed: ${results.failed}`)
        logger.info("=".repeat(60))

    } catch (error) {
        logger.error("❌ [Daily Renewals] Job failed:", error)
        throw error
    }
}

/**
 * Job Configuration
 * Runs every day at midnight
 */
export const config = {
    name: "process-daily-renewals",
    schedule: "0 0 * * *", // Midnight daily
}
