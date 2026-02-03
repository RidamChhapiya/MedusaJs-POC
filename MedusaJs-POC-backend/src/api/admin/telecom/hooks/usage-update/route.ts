import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import TelecomCoreModuleService from "@modules/telecom-core/service"

type UsageUpdateInput = {
    msisdn: string
    data_mb: number
    voice_min: number
}

/**
 * POST /admin/telecom/hooks/usage-update
 * 
 * Receives usage updates from network towers and updates usage counters.
 * Automatically bars subscriptions that exceed their data quota.
 */
export async function POST(
    req: MedusaRequest<UsageUpdateInput[]>,
    res: MedusaResponse
) {
    const telecomService: TelecomCoreModuleService = req.scope.resolve("telecom")
    const eventBusModule = req.scope.resolve(Modules.EVENT_BUS)

    const usageUpdates = req.body

    // Validate input
    if (!Array.isArray(usageUpdates)) {
        return res.status(400).json({
            error: "Request body must be an array of usage updates"
        })
    }

    const results = {
        processed: 0,
        updated: 0,
        barred: 0,
        errors: [] as string[]
    }

    // Get current month for usage counter
    const now = new Date()
    const cycleMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`

    console.log(`[Usage Update] Processing ${usageUpdates.length} usage updates for cycle ${cycleMonth}`)

    for (const update of usageUpdates) {
        try {
            results.processed++

            console.log(`[Usage Update] Processing ${update.msisdn}: +${update.data_mb}MB, +${update.voice_min}min`)

            // 1. Find MSISDN
            const msisdns = await telecomService.listMsisdnInventories({
                phone_number: update.msisdn
            })

            if (msisdns.length === 0) {
                results.errors.push(`MSISDN ${update.msisdn} not found`)
                continue
            }

            const msisdn = msisdns[0]

            // 2. Find active subscription for this MSISDN (subscription has msisdn = phone number)
            const subscriptions = await telecomService.listSubscriptions({
                msisdn: update.msisdn,
                status: "active"
            })

            if (subscriptions.length === 0) {
                results.errors.push(`No active subscription for ${update.msisdn}`)
                continue
            }

            const subscription = subscriptions[0]

            // 3. Find or create usage counter for current month (model: period_month, period_year, data_used_mb, voice_used_min)
            const periodMonth = now.getMonth() + 1
            const periodYear = now.getFullYear()
            let usageCounters = await telecomService.listUsageCounters({
                subscription_id: subscription.id,
                period_month: periodMonth,
                period_year: periodYear
            })

            let usageCounter
            if (usageCounters.length === 0) {
                const created = await telecomService.createUsageCounters({
                    subscription_id: subscription.id,
                    period_month: periodMonth,
                    period_year: periodYear,
                    data_used_mb: 0,
                    voice_used_min: 0
                } as any)
                usageCounter = Array.isArray(created) ? created[0] : created
                console.log(`[Usage Update] Created new usage counter for ${update.msisdn}`)
            } else {
                usageCounter = usageCounters[0]
            }

            // 4. Increment usage
            const newDataUsed = usageCounter.data_used_mb + update.data_mb
            const newVoiceUsed = usageCounter.voice_used_min + update.voice_min

            await telecomService.updateUsageCounters({
                id: usageCounter.id,
                data_used_mb: newDataUsed,
                voice_used_min: newVoiceUsed
            } as any)

            console.log(`[Usage Update] Updated ${update.msisdn}: Data ${usageCounter.data_used_mb}MB → ${newDataUsed}MB, Voice ${usageCounter.voice_used_min}min → ${newVoiceUsed}min`)

            results.updated++

            // 5. Check thresholds and emit events
            const planConfig = {
                data_quota_mb: 42000, // 42GB
                is_unlimited: false
            }

            if (!planConfig.is_unlimited) {
                const previousPercentage = (usageCounter.data_used_mb / planConfig.data_quota_mb) * 100
                const currentPercentage = (newDataUsed / planConfig.data_quota_mb) * 100

                console.log(`[Usage Update] ${update.msisdn} usage: ${currentPercentage.toFixed(2)}%`)

                // Check for threshold crossings
                if (currentPercentage >= 100 && previousPercentage < 100) {
                    // 100% - Suspend the subscription (model has no "barred", use suspended)
                    await telecomService.updateSubscriptions({
                        id: subscription.id,
                        status: "suspended"
                    } as any)

                    console.warn(`[Usage Update] ⚠️ BARRED ${update.msisdn} - exceeded quota (${newDataUsed}MB / ${planConfig.data_quota_mb}MB)`)

                    results.barred++

                    // Emit 100% event
                    await eventBusModule.emit({
                        name: "telecom.usage.limit_reached",
                        data: {
                            subscription_id: subscription.id,
                            msisdn: update.msisdn,
                            data_used: newDataUsed,
                            data_quota: planConfig.data_quota_mb,
                            percentage: currentPercentage,
                            threshold: 100
                        }
                    })

                    console.log(`[Usage Update] 🔔 Emitted telecom.usage.limit_reached event`)

                } else if (currentPercentage >= 80 && previousPercentage < 80) {
                    // 80% threshold
                    await eventBusModule.emit({
                        name: "telecom.usage.threshold_80",
                        data: {
                            subscription_id: subscription.id,
                            msisdn: update.msisdn,
                            data_used: newDataUsed,
                            data_quota: planConfig.data_quota_mb,
                            percentage: currentPercentage,
                            threshold: 80
                        }
                    })

                    console.log(`[Usage Update] ⚠️  80% threshold crossed for ${update.msisdn}`)

                } else if (currentPercentage >= 50 && previousPercentage < 50) {
                    // 50% threshold
                    await eventBusModule.emit({
                        name: "telecom.usage.threshold_50",
                        data: {
                            subscription_id: subscription.id,
                            msisdn: update.msisdn,
                            data_used: newDataUsed,
                            data_quota: planConfig.data_quota_mb,
                            percentage: currentPercentage,
                            threshold: 50
                        }
                    })

                    console.log(`[Usage Update] ℹ️  50% threshold crossed for ${update.msisdn}`)
                }
            }

        } catch (error) {
            console.error(`[Usage Update] Error processing ${update.msisdn}:`, error)
            results.errors.push(`${update.msisdn}: ${error.message}`)
        }
    }

    console.log(`[Usage Update] Summary: Processed ${results.processed}, Updated ${results.updated}, Barred ${results.barred}, Errors ${results.errors.length}`)

    return res.json(results)
}
