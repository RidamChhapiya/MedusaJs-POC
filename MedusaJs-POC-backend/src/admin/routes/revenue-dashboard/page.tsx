import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CurrencyDollar } from "@medusajs/icons"
import { Container, Heading } from "@medusajs/ui"
import { useEffect, useState } from "react"

// Revenue Dashboard Page
const RevenueDashboardPage = () => {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchRevenue()
    }, [])

    const fetchRevenue = async () => {
        try {
            setLoading(true)
            const response = await fetch("/admin/telecom/revenue/dashboard")
            const result = await response.json()
            setData(result)
        } catch (error) {
            console.error("Failed to fetch revenue:", error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <Container className="p-8">
                <div className="flex items-center justify-center h-64">
                    <div className="text-ui-fg-subtle">Loading revenue data...</div>
                </div>
            </Container>
        )
    }

    if (!data) {
        return (
            <Container className="p-8">
                <div className="text-ui-fg-subtle">Failed to load revenue data</div>
            </Container>
        )
    }

    const { summary, payment_stats, aging_analysis, top_customers, monthly_trend } = data

    return (
        <div className="flex flex-col gap-y-6 p-8">
            {/* Header */}
            <div>
                <Heading level="h1">Revenue Dashboard</Heading>
                <p className="text-ui-fg-subtle text-sm mt-1">
                    Financial overview and billing analytics
                </p>
            </div>

            {/* Revenue Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <RevenueCard
                    title="Total Revenue"
                    value={summary.formatted.total}
                    subtitle={`${summary.total_invoices} invoices`}
                    color="blue"
                />
                <RevenueCard
                    title="Paid Revenue"
                    value={summary.formatted.paid}
                    subtitle={`${summary.paid_invoices} paid`}
                    color="green"
                />
                <RevenueCard
                    title="Pending Revenue"
                    value={summary.formatted.pending}
                    subtitle={`${summary.pending_invoices} pending`}
                    color="orange"
                />
                <RevenueCard
                    title="Overdue Revenue"
                    value={summary.formatted.overdue}
                    subtitle={`${summary.overdue_invoices} overdue`}
                    color="red"
                />
            </div>

            {/* ARPU */}
            <Container className="p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-sm text-ui-fg-subtle">Average Revenue Per User (ARPU)</div>
                        <div className="text-3xl font-bold text-ui-fg-base mt-2">{summary.formatted.arpu}</div>
                    </div>
                    <span className="text-4xl">💰</span>
                </div>
            </Container>

            {/* Payment Statistics */}
            <Container className="p-6">
                <Heading level="h2" className="mb-4">Payment Statistics</Heading>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <div className="text-sm text-ui-fg-subtle">Total Attempts</div>
                        <div className="text-2xl font-bold text-ui-fg-base">{payment_stats.total_attempts}</div>
                    </div>
                    <div>
                        <div className="text-sm text-ui-fg-subtle">Successful</div>
                        <div className="text-2xl font-bold text-ui-tag-green-text">{payment_stats.successful}</div>
                    </div>
                    <div>
                        <div className="text-sm text-ui-fg-subtle">Failed</div>
                        <div className="text-2xl font-bold text-ui-tag-red-text">{payment_stats.failed}</div>
                    </div>
                    <div>
                        <div className="text-sm text-ui-fg-subtle">Success Rate</div>
                        <div className="text-2xl font-bold text-ui-tag-green-text">{payment_stats.success_rate}%</div>
                    </div>
                </div>
            </Container>

            {/* Aging Analysis */}
            <Container className="p-6">
                <Heading level="h2" className="mb-4">Aging Analysis</Heading>
                <div className="space-y-3">
                    <AgingRow label="Current (0-30 days)" value={aging_analysis.formatted.current} percentage={30} />
                    <AgingRow label="31-60 days" value={aging_analysis.formatted.days_31_60} percentage={20} color="orange" />
                    <AgingRow label="61-90 days" value={aging_analysis.formatted.days_61_90} percentage={15} color="red" />
                    <AgingRow label="Over 90 days" value={aging_analysis.formatted.over_90} percentage={10} color="red" />
                </div>
            </Container>

            {/* Monthly Trend */}
            <Container className="p-6">
                <Heading level="h2" className="mb-4">Monthly Revenue Trend</Heading>
                <div className="space-y-3">
                    {monthly_trend.map((month: any, index: number) => (
                        <div key={index} className="flex items-center justify-between border-b border-ui-border-base pb-3">
                            <div>
                                <div className="text-sm font-medium text-ui-fg-base">{month.month}</div>
                                <div className="text-xs text-ui-fg-subtle">{month.count} invoices</div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-medium text-ui-fg-base">
                                    ₹{(month.total / 100).toLocaleString()}
                                </div>
                                <div className="text-xs text-ui-tag-green-text">
                                    ₹{(month.paid / 100).toLocaleString()} paid
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </Container>

            {/* Top Customers */}
            <Container className="p-6">
                <Heading level="h2" className="mb-4">Top 10 Revenue Customers</Heading>
                <div className="space-y-2">
                    {top_customers.map((customer: any, index: number) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                                <span className="text-ui-fg-subtle">#{index + 1}</span>
                                <span className="font-medium text-ui-fg-base">{customer.customer_id.slice(0, 16)}...</span>
                            </div>
                            <span className="font-medium text-ui-tag-green-text">{customer.formatted_revenue}</span>
                        </div>
                    ))}
                </div>
            </Container>
        </div>
    )
}

// Revenue Card Component
const RevenueCard = ({ title, value, subtitle, color }: any) => {
    const colorClasses: any = {
        blue: "text-ui-tag-blue-text",
        green: "text-ui-tag-green-text",
        orange: "text-ui-tag-orange-text",
        red: "text-ui-tag-red-text"
    }

    return (
        <Container className="p-4">
            <div className="text-sm text-ui-fg-subtle mb-2">{title}</div>
            <div className={`text-2xl font-bold ${colorClasses[color] || "text-ui-fg-base"}`}>
                {value}
            </div>
            <div className="text-xs text-ui-fg-subtle mt-1">{subtitle}</div>
        </Container>
    )
}

// Aging Row Component
const AgingRow = ({ label, value, percentage, color = "blue" }: any) => {
    return (
        <div>
            <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-ui-fg-base">{label}</span>
                <span className="text-sm font-medium text-ui-fg-base">{value}</span>
            </div>
            <div className="w-full bg-ui-bg-subtle rounded-full h-2">
                <div
                    className={`bg-ui-tag-${color}-bg h-2 rounded-full`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    )
}

export const config = defineRouteConfig({
    label: "Revenue Dashboard",
    icon: CurrencyDollar,
})

export default RevenueDashboardPage
