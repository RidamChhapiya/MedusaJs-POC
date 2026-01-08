import { MedusaContainer } from "@medusajs/framework/types"
import TelecomCoreModuleService from "../modules/telecom-core/service"
import { Modules } from "@medusajs/framework/utils"

/**
 * Scheduled Job: Retry Failed Payments
 * 
 * Runs daily at 2 AM to retry failed payment attempts
 * Maximum 3 retries per payment
 * Suspends subscription after 3 failed attempts
 */
export default async function retryFailedPayments(container: MedusaContainer) {
    const logger = container.resolve("logger")
    const telecomService: TelecomCoreModuleService = container.resolve("telecom")
    const eventBus = container.resolve(Modules.EVENT_BUS)

    logger.info("💳 Processing Failed Payment Retries...")

    try {
        const now = new Date()

        // Find payment attempts that need retry
        const failedAttempts = await telecomService.listPaymentAttempts({
            status: "failed",
            next_retry_date: {
                $lte: now
            }
        })

        if (failedAttempts.length === 0) {
            logger.info("No failed payments to retry")
            return
        }

        logger.info(`Found ${failedAttempts.length} failed payment(s) to retry`)

        for (const attempt of failedAttempts) {
            try {
                // Check if max retries reached
                if (attempt.attempt_number >= attempt.max_retries) {
                    logger.warn(`Max retries reached for payment attempt: ${attempt.id}`)

                    // Suspend subscription
                    const [subscription] = await telecomService.listSubscriptions({
                        id: attempt.subscription_id
                    })

                    if (subscription && subscription.status === "active") {
                        await telecomService.updateSubscriptions(subscription.id, {
                            status: "suspended"
                        })

                        logger.warn(`Suspended subscription ${subscription.id} due to payment failure`)

                        // Emit event
                        await eventBus.emit("telecom.subscription.suspended", {
                            subscription_id: subscription.id,
                            reason: "payment_failure",
                            payment_attempt_id: attempt.id
                        })
                    }

                    // Mark attempt as cancelled
                    await telecomService.updatePaymentAttempts(attempt.id, {
                        status: "cancelled"
                    })

                    continue
                }

                // Create new retry attempt
                const nextRetryDate = new Date(now)
                nextRetryDate.setDate(nextRetryDate.getDate() + 2) // Retry in 2 days

                const newAttempt = await telecomService.createPaymentAttempts({
                    subscription_id: attempt.subscription_id,
                    invoice_id: attempt.invoice_id,
                    attempt_number: attempt.attempt_number + 1,
                    amount: attempt.amount,
                    status: "pending",
                    next_retry_date: nextRetryDate,
                    attempted_at: now
                })

                logger.info(`Created retry attempt ${newAttempt.attempt_number} for subscription ${attempt.subscription_id}`)

                // TODO: Integrate with actual payment gateway
                // For now, emit event for payment processing
                await eventBus.emit("telecom.payment.retry", {
                    payment_attempt_id: newAttempt.id,
                    subscription_id: attempt.subscription_id,
                    amount: attempt.amount,
                    attempt_number: newAttempt.attempt_number
                })

            } catch (error) {
                logger.error(`Error retrying payment ${attempt.id}:`, error)
            }
        }

        logger.info(`✅ Completed payment retry processing`)

    } catch (error) {
        logger.error("❌ Failed payment retry job failed:", error)
        throw error
    }
}

export const config = {
    name: "retry-failed-payments",
    schedule: "0 2 * * *", // Daily at 2 AM
}
