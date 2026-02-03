import { MedusaContainer } from "@medusajs/framework/types"
import TelecomCoreModuleService from "@modules/telecom-core/service"

/**
 * Scheduled Job: Release Expired Number Reservations
 * 
 * This job runs every 10 minutes to find phone numbers that have been
 * in 'reserved' status for more than 15 minutes and releases them back
 * to 'available' status.
 * 
 * This ensures that if a user abandons checkout, the number becomes
 * available for other users.
 */
export default async function releaseExpiredNumbers(container: MedusaContainer) {
    const telecomService: TelecomCoreModuleService = container.resolve("telecom")

    // Calculate the timestamp for 15 minutes ago
    const fifteenMinutesAgo = new Date()
    fifteenMinutesAgo.setMinutes(fifteenMinutesAgo.getMinutes() - 15)

    try {
        // Find all numbers that are 'reserved' and updated more than 15 minutes ago
        const expiredReservations = await telecomService.listMsisdnInventories({
            status: "reserved",
            updated_at: {
                $lt: fifteenMinutesAgo,
            },
        })

        if (!expiredReservations || expiredReservations.length === 0) {
            console.log("[Release Expired Numbers] No expired reservations found")
            return
        }

        console.log(
            `[Release Expired Numbers] Found ${expiredReservations.length} expired reservation(s)`
        )

        // Update all expired reservations back to 'available'
        for (const reservation of expiredReservations) {
            await telecomService.updateMsisdnInventories([
                {
                    id: reservation.id,
                    status: "available",
                },
            ])

            console.log(
                `[Release Expired Numbers] Released number: ${reservation.phone_number} (ID: ${reservation.id})`
            )
        }

        console.log(
            `[Release Expired Numbers] Successfully released ${expiredReservations.length} number(s)`
        )
    } catch (error) {
        console.error("[Release Expired Numbers] Error releasing expired numbers:", error)
        throw error
    }
}

/**
 * Job Configuration
 * - name: Unique identifier for the job
 * - schedule: Runs every 10 minutes (600000 milliseconds)
 */
export const config = {
    name: "release-expired-numbers",
    schedule: "*/10 * * * *", // Cron: Every 10 minutes
}
