import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import TelecomCoreModuleService from "../../../../modules/telecom-core/service"

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

        // Build current plans with usage data
        const currentPlans = await Promise.all(
            activeSubscriptions.map(async (sub) => {
                // Get plan details
                const plans = await telecomModule.listPlanConfigurations({
                    id: sub.plan_id
                })
                const plan = plans[0]

                // Get usage counter
                const counters = await telecomModule.listUsageCounters({
                    subscription_id: sub.id
                })
                const counter = counters[0]

                // Calculate days remaining
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
                        total_mb: counter?.data_quota_mb || 0,
                        used_mb: counter?.data_used_mb || 0,
                        remaining_mb: (counter?.data_quota_mb || 0) - (counter?.data_used_mb || 0),
                        percentage: counter?.data_quota_mb ?
                            Math.round(((counter.data_quota_mb - counter.data_used_mb) / counter.data_quota_mb) * 100) : 0
                    },
                    voice_balance: {
                        total_min: counter?.voice_quota_min || 0,
                        used_min: counter?.voice_used_min || 0,
                        remaining_min: (counter?.voice_quota_min || 0) - (counter?.voice_used_min || 0),
                        is_unlimited: (counter?.voice_quota_min || 0) >= 999999
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

                return {
                    invoice_id: invoice.id,
                    invoice_number: invoice.invoice_number,
                    date: invoice.created_at,
                    plan_name: plan?.name || "Unknown Plan",
                    amount: invoice.total_amount,
                    status: invoice.status,
                    payment_method: "card" // Mock for now
                }
            })
        )

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
            )
        })

    } catch (error) {
        console.error("[Customer Dashboard] Error:", error)
        return res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to load dashboard"
        })
    }
}
