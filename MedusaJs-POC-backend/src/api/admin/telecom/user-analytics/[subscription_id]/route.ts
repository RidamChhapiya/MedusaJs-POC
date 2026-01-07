import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import TelecomCoreModuleService from "../../../../../modules/telecom-core/service"

/**
 * Admin API: Individual User Deep Dive
 * GET /admin/telecom/user-analytics/:subscription_id
 * 
 * Provides comprehensive details for a single user including:
 * - Complete usage timeline
 * - All transactions and invoices
 * - Device contracts and payments
 * - Family plan details
 * - Behavioral insights
 */
export async function GET(
    req: MedusaRequest<{ subscription_id: string }>,
    res: MedusaResponse
) {
    const { subscription_id } = req.params
    const telecomModule: TelecomCoreModuleService = req.scope.resolve("telecom")

    try {
        // Get subscription
        const [subscription] = await telecomModule.listSubscriptions({ id: subscription_id })

        if (!subscription) {
            return res.status(404).json({ error: "Subscription not found" })
        }

        // Get MSISDN
        let msisdnDetails = null
        if (subscription.msisdn_id) {
            const [msisdn] = await telecomModule.listMsisdnInventories({ id: subscription.msisdn_id })
            if (msisdn) {
                msisdnDetails = {
                    phone_number: msisdn.phone_number,
                    tier: msisdn.tier,
                    region_code: msisdn.region_code,
                    status: msisdn.status
                }
            }
        }

        // Get ALL usage history
        const usageHistory = await telecomModule.listUsageCounters({
            subscription_id
        })

        const sortedUsage = usageHistory.sort((a, b) => {
            const dateA = new Date(a.period_year, a.period_month - 1)
            const dateB = new Date(b.period_year, b.period_month - 1)
            return dateB.getTime() - dateA.getTime()
        })

        // Get ALL invoices
        const invoices = await telecomModule.listInvoices({ subscription_id })
        const sortedInvoices = invoices.sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )

        // Get ALL payment attempts
        const paymentAttempts = await telecomModule.listPaymentAttempts({ subscription_id })
        const failedPayments = paymentAttempts.filter(p => p.status === "failed")

        // Get device contracts
        const deviceContracts = await telecomModule.listDeviceContracts({ subscription_id })

        // Get porting history
        const portingRequests = await telecomModule.listPortingRequests({
            customer_id: subscription.customer_id
        })

        // Get family plan details
        const familyMembers = await telecomModule.listFamilyMembers({ subscription_id })
        let familyPlanDetails = null

        if (familyMembers.length > 0) {
            const member = familyMembers[0]
            const [familyPlan] = await telecomModule.listFamilyPlans({ id: member.family_plan_id })

            if (familyPlan) {
                const allMembers = await telecomModule.listFamilyMembers({
                    family_plan_id: familyPlan.id
                })

                familyPlanDetails = {
                    plan_name: familyPlan.plan_name,
                    member_type: member.member_type,
                    joined_date: member.joined_date,
                    total_members: familyPlan.current_members,
                    max_members: familyPlan.max_members,
                    shared_data_quota_mb: familyPlan.total_data_quota_mb,
                    shared_voice_quota_min: familyPlan.total_voice_quota_min,
                    shared_data_used_mb: familyPlan.shared_data_used_mb || 0,
                    shared_voice_used_min: familyPlan.shared_voice_used_min || 0,
                    other_members: allMembers
                        .filter(m => m.id !== member.id)
                        .map(m => ({
                            subscription_id: m.subscription_id,
                            member_type: m.member_type,
                            status: m.status
                        }))
                }
            }
        }

        // Get roaming packages
        const roamingPackages = await telecomModule.listRoamingPackages({ subscription_id })

        // Get device insurance
        const insurancePolicies = await telecomModule.listDeviceInsurances({ subscription_id })

        // Calculate behavioral insights
        const insights = calculateBehavioralInsights({
            usageHistory: sortedUsage,
            invoices: sortedInvoices,
            subscription,
            deviceContracts
        })

        // Build comprehensive response
        return res.json({
            // Basic Info
            subscription: {
                id: subscription.id,
                customer_id: subscription.customer_id,
                status: subscription.status,
                created_at: subscription.created_at,
                account_age_days: Math.floor(
                    (Date.now() - new Date(subscription.created_at).getTime()) / (1000 * 60 * 60 * 24)
                ),
                renewal_date: subscription.renewal_date,
                billing_day: subscription.billing_day
            },

            // Phone Details
            msisdn: msisdnDetails,

            // Complete Usage Timeline
            usage_timeline: sortedUsage.map(u => ({
                period: `${u.period_month}/${u.period_year}`,
                data_used_mb: u.data_used_mb || 0,
                voice_used_min: u.voice_used_min || 0,
                data_gb: ((u.data_used_mb || 0) / 1024).toFixed(2),
                created_at: u.created_at
            })),

            // Usage Statistics
            usage_stats: {
                total_data_mb: sortedUsage.reduce((sum, u) => sum + (u.data_used_mb || 0), 0),
                total_voice_min: sortedUsage.reduce((sum, u) => sum + (u.voice_used_min || 0), 0),
                avg_data_per_month_mb: sortedUsage.length > 0
                    ? Math.round(sortedUsage.reduce((sum, u) => sum + (u.data_used_mb || 0), 0) / sortedUsage.length)
                    : 0,
                avg_voice_per_month_min: sortedUsage.length > 0
                    ? Math.round(sortedUsage.reduce((sum, u) => sum + (u.voice_used_min || 0), 0) / sortedUsage.length)
                    : 0,
                peak_data_month: sortedUsage.reduce((max, u) =>
                    (u.data_used_mb || 0) > (max.data_used_mb || 0) ? u : max,
                    sortedUsage[0] || {}
                ),
                total_months_active: sortedUsage.length
            },

            // Financial Timeline
            financial_timeline: sortedInvoices.map(inv => ({
                date: inv.created_at,
                invoice_number: inv.invoice_number,
                amount: inv.total_amount,
                status: inv.status,
                paid_date: inv.paid_date,
                formatted_amount: `₹${(inv.total_amount / 100).toFixed(2)}`
            })),

            // Revenue Summary
            revenue_summary: {
                total_invoiced: invoices.reduce((sum, inv) => sum + inv.total_amount, 0),
                total_paid: invoices.filter(inv => inv.status === "paid")
                    .reduce((sum, inv) => sum + inv.total_amount, 0),
                total_pending: invoices.filter(inv => inv.status === "pending")
                    .reduce((sum, inv) => sum + inv.total_amount, 0),
                total_overdue: invoices.filter(inv => inv.status === "overdue")
                    .reduce((sum, inv) => sum + inv.total_amount, 0),
                invoice_count: invoices.length,
                avg_invoice_value: invoices.length > 0
                    ? Math.round(invoices.reduce((sum, inv) => sum + inv.total_amount, 0) / invoices.length)
                    : 0
            },

            // Payment Behavior
            payment_behavior: {
                total_attempts: paymentAttempts.length,
                failed_attempts: failedPayments.length,
                success_rate: paymentAttempts.length > 0
                    ? Math.round(((paymentAttempts.length - failedPayments.length) / paymentAttempts.length) * 100)
                    : 100,
                recent_failures: failedPayments.slice(0, 5).map(p => ({
                    date: p.attempted_at,
                    reason: p.failure_reason,
                    amount: p.amount
                }))
            },

            // Device Contracts
            device_contracts: deviceContracts.map(dc => ({
                id: dc.id,
                device_product_id: dc.device_product_id,
                device_price: dc.device_price,
                down_payment: dc.down_payment,
                installment_amount: dc.installment_amount,
                installment_count: dc.installment_count,
                installments_paid: dc.installments_paid || 0,
                remaining_balance: (dc.installment_count - (dc.installments_paid || 0)) * dc.installment_amount,
                status: dc.status,
                next_payment_date: dc.next_payment_date,
                formatted: {
                    device_price: `₹${(dc.device_price / 100).toFixed(2)}`,
                    installment: `₹${(dc.installment_amount / 100).toFixed(2)}`,
                    remaining: `₹${(((dc.installment_count - (dc.installments_paid || 0)) * dc.installment_amount) / 100).toFixed(2)}`
                }
            })),

            // Porting History
            porting_history: portingRequests.map(pr => ({
                msisdn: pr.msisdn,
                port_type: pr.port_type,
                donor_operator: pr.donor_operator,
                status: pr.status,
                requested_date: pr.requested_date,
                completed_date: pr.completed_date
            })),

            // Family Plan
            family_plan: familyPlanDetails,

            // Roaming Packages
            roaming_packages: roamingPackages.map(rp => ({
                destination_country: rp.destination_country,
                package_type: rp.package_type,
                data_quota_mb: rp.data_quota_mb,
                voice_quota_min: rp.voice_quota_min,
                price: rp.price,
                validity_days: rp.validity_days,
                activation_date: rp.activation_date,
                expiry_date: rp.expiry_date,
                status: rp.status
            })),

            // Device Insurance
            insurance_policies: insurancePolicies.map(ins => ({
                device_product_id: ins.device_product_id,
                coverage_type: ins.coverage_type,
                monthly_premium: ins.monthly_premium,
                claim_limit: ins.claim_limit,
                claims_made: ins.claims_made,
                last_claim_date: ins.last_claim_date,
                status: ins.status,
                start_date: ins.start_date,
                end_date: ins.end_date
            })),

            // Behavioral Insights
            insights
        })

    } catch (error) {
        console.error("[User Deep Dive] Error:", error)
        return res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to fetch user details"
        })
    }
}

// Calculate behavioral insights
function calculateBehavioralInsights(data: any) {
    const { usageHistory, invoices, subscription, deviceContracts } = data

    const insights: any = {
        customer_segment: "standard",
        usage_pattern: "moderate",
        payment_reliability: "good",
        churn_risk: "low",
        upsell_opportunities: []
    }

    // Determine customer segment
    const totalRevenue = invoices.reduce((sum: number, inv: any) => sum + inv.total_amount, 0)
    if (totalRevenue > 1000000) insights.customer_segment = "premium" // ₹10,000+
    else if (totalRevenue > 500000) insights.customer_segment = "high-value" // ₹5,000+
    else if (totalRevenue > 200000) insights.customer_segment = "mid-tier" // ₹2,000+

    // Determine usage pattern
    const avgDataUsage = usageHistory.length > 0
        ? usageHistory.reduce((sum: number, u: any) => sum + (u.data_used_mb || 0), 0) / usageHistory.length
        : 0

    if (avgDataUsage > 30000) insights.usage_pattern = "heavy" // 30GB+
    else if (avgDataUsage > 10000) insights.usage_pattern = "moderate" // 10GB+
    else insights.usage_pattern = "light"

    // Payment reliability
    const paidInvoices = invoices.filter((inv: any) => inv.status === "paid").length
    const totalInvoices = invoices.length
    const paymentRate = totalInvoices > 0 ? (paidInvoices / totalInvoices) * 100 : 100

    if (paymentRate > 90) insights.payment_reliability = "excellent"
    else if (paymentRate > 70) insights.payment_reliability = "good"
    else insights.payment_reliability = "poor"

    // Churn risk
    if (subscription.status !== "active") insights.churn_risk = "high"
    else if (paymentRate < 70) insights.churn_risk = "medium"
    else if (avgDataUsage < 1000) insights.churn_risk = "medium" // Very low usage
    else insights.churn_risk = "low"

    // Upsell opportunities
    if (deviceContracts.length === 0) {
        insights.upsell_opportunities.push("Device financing available")
    }
    if (avgDataUsage > 40000) {
        insights.upsell_opportunities.push("Upgrade to unlimited plan")
    }
    if (!data.familyPlan && totalRevenue > 300000) {
        insights.upsell_opportunities.push("Family plan eligible")
    }

    return insights
}
