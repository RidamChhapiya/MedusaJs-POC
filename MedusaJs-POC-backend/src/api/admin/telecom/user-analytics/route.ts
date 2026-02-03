import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import TelecomCoreModuleService from "@modules/telecom-core/service"

/**
 * Admin API: Comprehensive User Analytics Dashboard
 * GET /admin/telecom/user-analytics
 * 
 * Provides detailed insights into all Nexel users:
 * - Usage patterns (data, voice, SMS)
 * - Recharge history and revenue
 * - Customer lifetime value
 * - Subscription status
 * - Device contracts and add-ons
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const telecomModule: TelecomCoreModuleService = req.scope.resolve("telecom")

    const {
        limit = 50,
        offset = 0,
        status,
        sort_by = "revenue_desc" // revenue_desc, usage_desc, recent
    } = req.query as any

    try {
        // Get all subscriptions with filters
        const filters: any = {}
        if (status) filters.status = status

        const subscriptions = await telecomModule.listSubscriptions(filters, {
            take: parseInt(limit),
            skip: parseInt(offset)
        })

        // Enrich each subscription with comprehensive analytics
        const enrichedUsers = await Promise.all(
            subscriptions.map(async (sub) => {
                // Get MSISDN details
                let phoneNumber = sub.msisdn || "N/A"
                let tier = "standard"

                // If we have the phone number, get additional MSISDN details
                if (sub.msisdn) {
                    const msisdns = await telecomModule.listMsisdnInventories({
                        phone_number: sub.msisdn
                    })
                    if (msisdns.length > 0) {
                        tier = msisdns[0].tier
                    }
                }

                // Get current period usage
                const currentDate = new Date()
                const currentMonth = currentDate.getMonth() + 1
                const currentYear = currentDate.getFullYear()

                const [currentUsage] = await telecomModule.listUsageCounters({
                    subscription_id: sub.id,
                    period_month: currentMonth,
                    period_year: currentYear
                })

                // Get historical usage (last 6 months)
                const usageHistory = await telecomModule.listUsageCounters({
                    subscription_id: sub.id
                })

                const last6MonthsUsage = usageHistory
                    .sort((a, b) => {
                        const dateA = new Date(a.period_year, a.period_month - 1)
                        const dateB = new Date(b.period_year, b.period_month - 1)
                        return dateB.getTime() - dateA.getTime()
                    })
                    .slice(0, 6)

                // Calculate total usage
                const totalDataUsed = usageHistory.reduce((sum, u) => sum + (u.data_used_mb || 0), 0)
                const totalVoiceUsed = usageHistory.reduce((sum, u) => sum + (u.voice_used_min || 0), 0)

                // Get invoices for revenue calculation
                const invoices = await telecomModule.listInvoices({
                    subscription_id: sub.id
                })

                const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total_amount, 0)
                const paidRevenue = invoices
                    .filter(inv => inv.status === "paid")
                    .reduce((sum, inv) => sum + inv.total_amount, 0)
                const pendingRevenue = totalRevenue - paidRevenue

                // Get recharge history (paid invoices)
                const recharges = invoices
                    .filter(inv => inv.status === "paid")
                    .sort((a, b) => new Date(b.paid_date || b.created_at).getTime() - new Date(a.paid_date || a.created_at).getTime())
                    .slice(0, 5)
                    .map(inv => ({
                        date: inv.paid_date || inv.created_at,
                        amount: inv.total_amount,
                        invoice_number: inv.invoice_number
                    }))

                // Get device contracts
                const deviceContracts = await telecomModule.listDeviceContracts({
                    subscription_id: sub.id
                })

                const activeContracts = deviceContracts.filter(dc => dc.status === "active")
                const totalDeviceRevenue = deviceContracts.reduce(
                    (sum, dc) => sum + (dc.device_price - dc.down_payment),
                    0
                )

                // Get family plan membership
                const familyMembers = await telecomModule.listFamilyMembers({
                    subscription_id: sub.id
                })

                let familyPlanInfo: { plan_name: string; member_type: string; total_members: number; shared_data_quota: number; shared_voice_quota: number } | null = null
                if (familyMembers.length > 0) {
                    const member = familyMembers[0]
                    const [familyPlan] = await telecomModule.listFamilyPlans({ id: member.family_plan_id })
                    if (familyPlan) {
                        familyPlanInfo = {
                            plan_name: familyPlan.plan_name,
                            member_type: member.member_type,
                            total_members: familyPlan.current_members,
                            shared_data_quota: familyPlan.total_data_quota_mb,
                            shared_voice_quota: familyPlan.total_voice_quota_min
                        }
                    }
                }

                // Get roaming packages
                const roamingPackages = await telecomModule.listRoamingPackages({
                    subscription_id: sub.id,
                    status: "active"
                })

                // Get device insurance
                const insurancePolicies = await telecomModule.listDeviceInsurances({
                    subscription_id: sub.id,
                    status: "active"
                })

                // Calculate customer metrics
                const accountAge = Math.floor(
                    (currentDate.getTime() - new Date(sub.created_at).getTime()) / (1000 * 60 * 60 * 24)
                )

                const avgMonthlyRevenue = accountAge > 30
                    ? (paidRevenue / Math.floor(accountAge / 30))
                    : paidRevenue

                const customerLTV = avgMonthlyRevenue * 24 // 24 months average lifespan

                // Usage patterns
                const avgDataPerMonth = last6MonthsUsage.length > 0
                    ? last6MonthsUsage.reduce((sum, u) => sum + (u.data_used_mb || 0), 0) / last6MonthsUsage.length
                    : 0

                const avgVoicePerMonth = last6MonthsUsage.length > 0
                    ? last6MonthsUsage.reduce((sum, u) => sum + (u.voice_used_min || 0), 0) / last6MonthsUsage.length
                    : 0

                // Risk indicators
                const riskScore = calculateRiskScore({
                    pendingRevenue,
                    status: sub.status,
                    lastRechargeDate: recharges[0]?.date,
                    usageLevel: currentUsage?.data_used_mb || 0
                })

                return {
                    // Basic Info
                    subscription_id: sub.id,
                    customer_id: sub.customer_id,
                    phone_number: phoneNumber,
                    tier,
                    status: sub.status,
                    account_age_days: accountAge,

                    // Current Usage
                    current_period: {
                        data_used_mb: currentUsage?.data_used_mb || 0,
                        voice_used_min: currentUsage?.voice_used_min || 0,
                        data_percentage: currentUsage?.data_used_mb
                            ? Math.round((currentUsage.data_used_mb / 51200) * 100) // Assuming 50GB plan
                            : 0,
                        voice_percentage: currentUsage?.voice_used_min
                            ? Math.round((currentUsage.voice_used_min / 3000) * 100) // Assuming 3000 min plan
                            : 0
                    },

                    // Historical Usage
                    usage_history: {
                        total_data_mb: totalDataUsed,
                        total_voice_min: totalVoiceUsed,
                        avg_data_per_month_mb: Math.round(avgDataPerMonth),
                        avg_voice_per_month_min: Math.round(avgVoicePerMonth),
                        last_6_months: last6MonthsUsage.map(u => ({
                            month: u.period_month,
                            year: u.period_year,
                            data_mb: u.data_used_mb || 0,
                            voice_min: u.voice_used_min || 0
                        }))
                    },

                    // Revenue Metrics
                    revenue: {
                        total: totalRevenue,
                        paid: paidRevenue,
                        pending: pendingRevenue,
                        avg_monthly: Math.round(avgMonthlyRevenue),
                        lifetime_value: Math.round(customerLTV),
                        device_contracts_value: totalDeviceRevenue,
                        formatted: {
                            total: `₹${(totalRevenue / 100).toFixed(2)}`,
                            paid: `₹${(paidRevenue / 100).toFixed(2)}`,
                            pending: `₹${(pendingRevenue / 100).toFixed(2)}`,
                            ltv: `₹${(customerLTV / 100).toFixed(2)}`
                        }
                    },

                    // Recharge History
                    recharge_history: {
                        total_recharges: recharges.length,
                        last_recharge_date: recharges[0]?.date || null,
                        last_recharge_amount: recharges[0]?.amount || 0,
                        recent_recharges: recharges
                    },

                    // Add-ons & Services
                    services: {
                        device_contracts: activeContracts.length,
                        active_roaming: roamingPackages.length,
                        insurance_policies: insurancePolicies.length,
                        family_plan: familyPlanInfo
                    },

                    // Billing Info
                    billing: {
                        next_renewal: (sub as any).renewal_date ?? sub.end_date,
                        billing_day: (sub as any).billing_day ?? null,
                        days_until_renewal: Math.ceil(
                            (new Date((sub as any).renewal_date ?? sub.end_date).getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
                        )
                    },

                    // Risk Assessment
                    risk_assessment: {
                        score: riskScore,
                        level: riskScore > 70 ? "high" : riskScore > 40 ? "medium" : "low",
                        indicators: getRiskIndicators(riskScore, {
                            pendingRevenue,
                            status: sub.status,
                            lastRechargeDate: recharges[0]?.date
                        })
                    }
                }
            })
        )

        // Sort results
        const sortedUsers = sortUsers(enrichedUsers, sort_by)

        // Calculate summary statistics
        const summary = {
            total_users: enrichedUsers.length,
            active_users: enrichedUsers.filter(u => u.status === "active").length,
            suspended_users: enrichedUsers.filter(u => u.status === "suspended").length,
            total_revenue: enrichedUsers.reduce((sum, u) => sum + u.revenue.total, 0),
            total_data_usage_gb: Math.round(enrichedUsers.reduce((sum, u) => sum + u.usage_history.total_data_mb, 0) / 1024),
            avg_ltv: Math.round(
                enrichedUsers.reduce((sum, u) => sum + u.revenue.lifetime_value, 0) / enrichedUsers.length
            ),
            high_risk_users: enrichedUsers.filter(u => u.risk_assessment.level === "high").length
        }

        return res.json({
            users: sortedUsers,
            summary,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                total: enrichedUsers.length
            }
        })

    } catch (error) {
        console.error("[User Analytics] Error:", error)
        return res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to fetch user analytics"
        })
    }
}

// Helper: Calculate risk score (0-100)
function calculateRiskScore(data: any): number {
    let score = 0

    // Pending revenue risk
    if (data.pendingRevenue > 100000) score += 30 // ₹1000+
    else if (data.pendingRevenue > 50000) score += 20
    else if (data.pendingRevenue > 0) score += 10

    // Status risk
    if (data.status === "barred") score += 40
    else if (data.status === "suspended") score += 30

    // Last recharge risk
    if (data.lastRechargeDate) {
        const daysSinceRecharge = Math.floor(
            (Date.now() - new Date(data.lastRechargeDate).getTime()) / (1000 * 60 * 60 * 24)
        )
        if (daysSinceRecharge > 60) score += 20
        else if (daysSinceRecharge > 30) score += 10
    } else {
        score += 25 // Never recharged
    }

    // Low usage risk (potential churn)
    if (data.usageLevel < 100) score += 10 // Less than 100MB

    return Math.min(score, 100)
}

// Helper: Get risk indicators
function getRiskIndicators(score: number, data: any): string[] {
    const indicators: string[] = []

    if (data.pendingRevenue > 0) {
        indicators.push(`Pending payment: ₹${(data.pendingRevenue / 100).toFixed(2)}`)
    }

    if (data.status !== "active") {
        indicators.push(`Account ${data.status}`)
    }

    if (data.lastRechargeDate) {
        const daysSinceRecharge = Math.floor(
            (Date.now() - new Date(data.lastRechargeDate).getTime()) / (1000 * 60 * 60 * 24)
        )
        if (daysSinceRecharge > 30) {
            indicators.push(`No recharge in ${daysSinceRecharge} days`)
        }
    } else {
        indicators.push("Never recharged")
    }

    return indicators
}

// Helper: Sort users
function sortUsers(users: any[], sortBy: string): any[] {
    switch (sortBy) {
        case "revenue_desc":
            return users.sort((a, b) => b.revenue.total - a.revenue.total)
        case "usage_desc":
            return users.sort((a, b) => b.usage_history.total_data_mb - a.usage_history.total_data_mb)
        case "recent":
            return users.sort((a, b) =>
                new Date(b.recharge_history.last_recharge_date || 0).getTime() -
                new Date(a.recharge_history.last_recharge_date || 0).getTime()
            )
        case "risk_desc":
            return users.sort((a, b) => b.risk_assessment.score - a.risk_assessment.score)
        default:
            return users
    }
}
