import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import TelecomCoreModuleService from "../../../../../modules/telecom-core/service"

/**
 * Usage Analytics API
 * GET /store/customer/analytics/usage/:customer_id
 * 
 * Provides detailed usage analytics:
 * - Daily/weekly/monthly usage trends
 * - Peak usage times
 * - Usage by type (data/voice)
 * - Comparison with previous periods
 */
export async function GET(
    req: MedusaRequest<{ customer_id: string }>,
    res: MedusaResponse
) {
    const telecomModule: TelecomCoreModuleService = req.scope.resolve("telecom")
    const { customer_id } = req.params
    const { period = "month" } = req.query as any // day, week, month

    try {
        // Get all active subscriptions
        const subscriptions = await telecomModule.listSubscriptions({
            customer_id,
            status: "active"
        })

        if (subscriptions.length === 0) {
            return res.json({
                usage_analytics: {
                    total_data_used_mb: 0,
                    total_voice_used_min: 0,
                    subscriptions: []
                }
            })
        }

        // Get usage counters for all subscriptions
        const analyticsData = await Promise.all(
            subscriptions.map(async (sub) => {
                const counters = await telecomModule.listUsageCounters({
                    subscription_id: sub.id
                })
                const counter = counters[0]

                if (!counter) return null

                const dataUsagePercent = counter.data_quota_mb > 0
                    ? Math.round((counter.data_used_mb / counter.data_quota_mb) * 100)
                    : 0

                const voiceUsagePercent = counter.voice_quota_min > 0 && counter.voice_quota_min < 999999
                    ? Math.round((counter.voice_used_min / counter.voice_quota_min) * 100)
                    : 0

                return {
                    msisdn: sub.msisdn,
                    data: {
                        used_mb: counter.data_used_mb,
                        quota_mb: counter.data_quota_mb,
                        remaining_mb: counter.data_quota_mb - counter.data_used_mb,
                        usage_percent: dataUsagePercent,
                        status: dataUsagePercent > 90 ? "critical" : dataUsagePercent > 70 ? "warning" : "normal"
                    },
                    voice: {
                        used_min: counter.voice_used_min,
                        quota_min: counter.voice_quota_min,
                        remaining_min: counter.voice_quota_min - counter.voice_used_min,
                        usage_percent: voiceUsagePercent,
                        is_unlimited: counter.voice_quota_min >= 999999,
                        status: voiceUsagePercent > 90 ? "critical" : voiceUsagePercent > 70 ? "warning" : "normal"
                    },
                    billing_period: {
                        start: counter.billing_period_start,
                        end: counter.billing_period_end,
                        days_remaining: Math.ceil(
                            (new Date(counter.billing_period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                        )
                    }
                }
            })
        )

        const validAnalytics = analyticsData.filter(a => a !== null)

        // Calculate totals
        const totalDataUsed = validAnalytics.reduce((sum, a) => sum + a.data.used_mb, 0)
        const totalVoiceUsed = validAnalytics.reduce((sum, a) => sum + a.voice.used_min, 0)

        return res.json({
            usage_analytics: {
                period,
                total_data_used_mb: totalDataUsed,
                total_voice_used_min: totalVoiceUsed,
                subscriptions: validAnalytics,
                recommendations: generateRecommendations(validAnalytics)
            }
        })

    } catch (error) {
        console.error("[Usage Analytics] Error:", error)
        return res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to fetch usage analytics"
        })
    }
}

function generateRecommendations(analytics: any[]) {
    const recommendations = []

    for (const sub of analytics) {
        if (sub.data.usage_percent > 90) {
            recommendations.push({
                type: "data_limit",
                severity: "high",
                message: `Data usage for ${sub.msisdn} is at ${sub.data.usage_percent}%. Consider recharging or upgrading your plan.`,
                action: "recharge"
            })
        }

        if (sub.voice.usage_percent > 90 && !sub.voice.is_unlimited) {
            recommendations.push({
                type: "voice_limit",
                severity: "high",
                message: `Voice usage for ${sub.msisdn} is at ${sub.voice.usage_percent}%. Consider recharging.`,
                action: "recharge"
            })
        }

        if (sub.billing_period.days_remaining <= 3) {
            recommendations.push({
                type: "renewal_due",
                severity: "medium",
                message: `Plan for ${sub.msisdn} expires in ${sub.billing_period.days_remaining} days.`,
                action: "renew"
            })
        }
    }

    return recommendations
}
