import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import TelecomCoreModuleService from "../../../../../modules/telecom-core/service"

/**
 * Admin API: Revenue Dashboard
 * GET /admin/telecom/revenue/dashboard
 * 
 * Provides comprehensive revenue analytics:
 * - Total revenue metrics
 * - Payment statistics
 * - Aging analysis
 * - Top customers
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const telecomModule: TelecomCoreModuleService = req.scope.resolve("telecom")

    try {
        // Get all invoices
        const invoices = await telecomModule.listInvoices({})

        // Get all subscriptions for customer count
        const subscriptions = await telecomModule.listSubscriptions({})

        // Calculate revenue metrics
        const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total_amount, 0)
        const paidRevenue = invoices
            .filter(inv => inv.status === "paid")
            .reduce((sum, inv) => sum + inv.total_amount, 0)
        const pendingRevenue = invoices
            .filter(inv => inv.status === "pending")
            .reduce((sum, inv) => sum + inv.total_amount, 0)
        const overdueRevenue = invoices
            .filter(inv => inv.status === "overdue")
            .reduce((sum, inv) => sum + inv.total_amount, 0)

        // Payment statistics
        const paymentAttempts = await telecomModule.listPaymentAttempts({})
        const successfulPayments = paymentAttempts.filter(p => p.status === "success").length
        const failedPayments = paymentAttempts.filter(p => p.status === "failed").length
        const paymentSuccessRate = paymentAttempts.length > 0
            ? Math.round((successfulPayments / paymentAttempts.length) * 100)
            : 100

        // Aging analysis (invoices by age)
        const now = new Date()
        const aging = {
            current: 0,      // 0-30 days
            days_31_60: 0,   // 31-60 days
            days_61_90: 0,   // 61-90 days
            over_90: 0       // 90+ days
        }

        invoices.filter(inv => inv.status === "pending" || inv.status === "overdue").forEach(inv => {
            const daysOld = Math.floor((now.getTime() - new Date(inv.issue_date).getTime()) / (1000 * 60 * 60 * 24))
            const amount = inv.total_amount

            if (daysOld <= 30) aging.current += amount
            else if (daysOld <= 60) aging.days_31_60 += amount
            else if (daysOld <= 90) aging.days_61_90 += amount
            else aging.over_90 += amount
        })

        // Top revenue customers
        const customerRevenue = invoices
            .filter(inv => inv.status === "paid")
            .reduce((acc: any, inv) => {
                acc[inv.customer_id] = (acc[inv.customer_id] || 0) + inv.total_amount
                return acc
            }, {})

        const topCustomers = Object.entries(customerRevenue)
            .map(([customer_id, revenue]) => ({
                customer_id,
                revenue: revenue as number,
                formatted_revenue: `₹${((revenue as number) / 100).toLocaleString()}`
            }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10)

        // Monthly revenue trend (last 6 months)
        const monthlyRevenue: any[] = []
        for (let i = 5; i >= 0; i--) {
            const date = new Date()
            date.setMonth(date.getMonth() - i)
            const month = date.getMonth() + 1
            const year = date.getFullYear()

            const monthInvoices = invoices.filter(inv => {
                const invDate = new Date(inv.created_at)
                return invDate.getMonth() + 1 === month && invDate.getFullYear() === year
            })

            monthlyRevenue.push({
                month: `${year}-${month.toString().padStart(2, '0')}`,
                total: monthInvoices.reduce((sum, inv) => sum + inv.total_amount, 0),
                paid: monthInvoices.filter(inv => inv.status === "paid")
                    .reduce((sum, inv) => sum + inv.total_amount, 0),
                count: monthInvoices.length
            })
        }

        // ARPU (Average Revenue Per User)
        const activeSubscriptions = subscriptions.filter(s => s.status === "active").length
        const arpu = activeSubscriptions > 0 ? Math.round(paidRevenue / activeSubscriptions) : 0

        return res.json({
            summary: {
                total_revenue: totalRevenue,
                paid_revenue: paidRevenue,
                pending_revenue: pendingRevenue,
                overdue_revenue: overdueRevenue,
                total_invoices: invoices.length,
                paid_invoices: invoices.filter(inv => inv.status === "paid").length,
                pending_invoices: invoices.filter(inv => inv.status === "pending").length,
                overdue_invoices: invoices.filter(inv => inv.status === "overdue").length,
                arpu,
                formatted: {
                    total: `₹${(totalRevenue / 100).toLocaleString()}`,
                    paid: `₹${(paidRevenue / 100).toLocaleString()}`,
                    pending: `₹${(pendingRevenue / 100).toLocaleString()}`,
                    overdue: `₹${(overdueRevenue / 100).toLocaleString()}`,
                    arpu: `₹${(arpu / 100).toFixed(2)}`
                }
            },
            payment_stats: {
                total_attempts: paymentAttempts.length,
                successful: successfulPayments,
                failed: failedPayments,
                success_rate: paymentSuccessRate
            },
            aging_analysis: {
                current: aging.current,
                days_31_60: aging.days_31_60,
                days_61_90: aging.days_61_90,
                over_90: aging.over_90,
                formatted: {
                    current: `₹${(aging.current / 100).toLocaleString()}`,
                    days_31_60: `₹${(aging.days_31_60 / 100).toLocaleString()}`,
                    days_61_90: `₹${(aging.days_61_90 / 100).toLocaleString()}`,
                    over_90: `₹${(aging.over_90 / 100).toLocaleString()}`
                }
            },
            top_customers: topCustomers,
            monthly_trend: monthlyRevenue
        })

    } catch (error) {
        console.error("[Revenue Dashboard] Error:", error)
        return res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to fetch revenue dashboard"
        })
    }
}
