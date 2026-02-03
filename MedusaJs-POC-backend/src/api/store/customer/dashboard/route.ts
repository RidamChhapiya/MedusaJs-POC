import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import TelecomCoreModuleService from "@modules/telecom-core/service"

/**
 * Customer Dashboard API
 * GET /store/customer/dashboard
 * 
 * Returns complete dashboard data:
 * - Customer profile
 * - Current active plans
 * - Usage statistics
 * - Plan history
 * - Upcoming renewals
 * - Recharge history
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const telecomModule: TelecomCoreModuleService = req.scope.resolve("telecom")

    try {
        // Get customer_id from query or session
        const { customer_id } = req.query as any

        if (!customer_id) {
            return res.status(400).json({
                error: "Customer ID required"
            })
        }

        // Get customer profile
        const profiles = await telecomModule.listCustomerProfiles({
            customer_id
        })

        if (profiles.length === 0) {
            return res.status(404).json({
                error: "Customer not found"
            })
        }

        const profile = profiles[0]

        // Get customer details
        const customerModule = req.scope.resolve("customer")
        const [customer] = await customerModule.listCustomers({
            id: customer_id
        })

        // Get all subscriptions for this customer
        const allSubscriptions = await telecomModule.listSubscriptions({
            customer_id
        })

        // Separate active and inactive subscriptions
        const activeSubscriptions = allSubscriptions.filter(s => s.status === "active")
        const inactiveSubscriptions = allSubscriptions.filter(s => s.status !== "active")

        // Build current plans with usage data (use subscription balances + plan quotas)
        const currentPlans = await Promise.all(
            activeSubscriptions.map(async (sub) => {
                const plans = await telecomModule.listPlanConfigurations({
                    id: sub.plan_id
                })
                const plan = plans[0]
                const dataQuotaMb = plan?.data_quota_mb ?? 0
                const voiceQuotaMin = plan?.voice_quota_min ?? 0
                const remainingMb = sub.data_balance_mb ?? 0
                const remainingMin = sub.voice_balance_min ?? 0
                const usedMb = Math.max(0, dataQuotaMb - remainingMb)
                const usedMin = voiceQuotaMin >= 999999 ? 0 : Math.max(0, (voiceQuotaMin ?? 0) - remainingMin)

                const endDate = new Date(sub.end_date)
                const today = new Date()
                const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

                return {
                    subscription_id: sub.id,
                    msisdn: sub.msisdn,
                    plan_name: plan?.name || "Unknown Plan",
                    status: sub.status,
                    start_date: sub.start_date,
                    end_date: sub.end_date,
                    days_remaining: daysRemaining > 0 ? daysRemaining : 0,
                    data_balance: {
                        total_mb: dataQuotaMb,
                        used_mb: usedMb,
                        remaining_mb: remainingMb,
                        percentage: dataQuotaMb > 0 ? Math.round((remainingMb / dataQuotaMb) * 100) : 0
                    },
                    voice_balance: {
                        total_min: voiceQuotaMin,
                        used_min: usedMin,
                        remaining_min: remainingMin,
                        is_unlimited: voiceQuotaMin >= 999999
                    }
                }
            })
        )

        // Build plan history
        const planHistory = await Promise.all(
            inactiveSubscriptions.map(async (sub) => {
                const plans = await telecomModule.listPlanConfigurations({
                    id: sub.plan_id
                })
                const plan = plans[0]

                // Get invoice for this subscription
                const invoices = await telecomModule.listInvoices({
                    subscription_id: sub.id
                })

                const totalSpent = invoices.reduce((sum, inv) => sum + inv.total_amount, 0)

                return {
                    subscription_id: sub.id,
                    msisdn: sub.msisdn,
                    plan_name: plan?.name || "Unknown Plan",
                    status: sub.status,
                    start_date: sub.start_date,
                    end_date: sub.end_date,
                    total_spent: totalSpent
                }
            })
        )

        // Get upcoming renewals (active subscriptions with auto_renew)
        const upcomingRenewals = await Promise.all(
            activeSubscriptions
                .filter(sub => sub.auto_renew)
                .map(async (sub) => {
                    const plans = await telecomModule.listPlanConfigurations({
                        id: sub.plan_id
                    })
                    const plan = plans[0]

                    return {
                        subscription_id: sub.id,
                        renewal_date: sub.end_date,
                        plan_name: plan?.name || "Unknown Plan",
                        amount: plan?.price || 0,
                        auto_renew: sub.auto_renew
                    }
                })
        )

        // Get recharge history (all invoices)
        const allInvoices = await telecomModule.listInvoices({
            customer_id
        })

        const rechargeHistory = await Promise.all(
            allInvoices.map(async (invoice) => {
                const subs = await telecomModule.listSubscriptions({
                    id: invoice.subscription_id
                })
                const sub = subs[0]
                const plans = await telecomModule.listPlanConfigurations({
                    id: sub?.plan_id
                })
                const plan = plans[0]
                const date = (invoice as any).created_at ?? invoice.issue_date
                return {
                    invoice_id: invoice.id,
                    invoice_number: invoice.invoice_number,
                    date,
                    plan_name: plan?.name || "Unknown Plan",
                    amount: invoice.total_amount,
                    status: invoice.status,
                    payment_method: "card"
                }
            })
        )

        const now = new Date()
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

        let spending_this_month = 0
        let spending_last_month = 0
        const spending_by_month: { month: string; amount: number }[] = []
        const last6Months: Date[] = []
        for (let i = 0; i < 6; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
            last6Months.push(d)
        }

        for (const inv of allInvoices) {
            const invDate = (inv as any).created_at ? new Date((inv as any).created_at) : new Date(inv.issue_date)
            const amount = inv.total_amount ?? 0
            if (invDate >= thisMonthStart) spending_this_month += amount
            if (invDate >= lastMonthStart && invDate <= lastMonthEnd) spending_last_month += amount
            for (let i = 0; i < last6Months.length; i++) {
                const start = last6Months[i]
                const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59)
                if (invDate >= start && invDate <= end) {
                    const key = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`
                    const existing = spending_by_month.find((m) => m.month === key)
                    if (existing) existing.amount += amount
                    else spending_by_month.push({ month: key, amount })
                    break
                }
            }
        }
        spending_by_month.sort((a, b) => b.month.localeCompare(a.month))

        return res.json({
            customer: {
                id: customer.id,
                full_name: profile.full_name,
                email: customer.email,
                primary_phone: profile.primary_phone,
                is_nexel_subscriber: profile.is_nexel_subscriber,
                nexel_numbers: profile.nexel_numbers || [],
                kyc_status: profile.kyc_status
            },
            current_plans: currentPlans,
            plan_history: planHistory,
            upcoming_renewals: upcomingRenewals,
            recharge_history: rechargeHistory.sort((a, b) =>
                new Date(b.date).getTime() - new Date(a.date).getTime()
            ),
            analytics: {
                spending_this_month,
                spending_last_month,
                spending_by_month: spending_by_month.slice(0, 6)
            }
        })

    } catch (error) {
        console.error("[Customer Dashboard] Error:", error)
        return res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to load dashboard"
        })
    }
}
