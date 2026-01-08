import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Users } from "@medusajs/icons"
import { Container, Heading } from "@medusajs/ui"
import { useEffect, useState } from "react"

// Main User Analytics Dashboard Page
const UserAnalyticsPage = () => {
    const [analytics, setAnalytics] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [sortBy, setSortBy] = useState("revenue_desc")
    const [statusFilter, setStatusFilter] = useState("all")

    useEffect(() => {
        fetchAnalytics()
    }, [sortBy, statusFilter])

    const fetchAnalytics = async () => {
        try {
            setLoading(true)
            const params = new URLSearchParams({
                sort_by: sortBy,
                limit: "50",
                offset: "0"
            })

            if (statusFilter !== "all") {
                params.append("status", statusFilter)
            }

            const response = await fetch(`/admin/telecom/user-analytics?${params}`)
            const data = await response.json()
            setAnalytics(data)
        } catch (error) {
            console.error("Failed to fetch analytics:", error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <Container className="p-8">
                <div className="flex items-center justify-center h-64">
                    <div className="text-ui-fg-subtle">Loading analytics...</div>
                </div>
            </Container>
        )
    }

    if (!analytics) {
        return (
            <Container className="p-8">
                <div className="text-ui-fg-subtle">Failed to load analytics</div>
            </Container>
        )
    }

    const { users, summary } = analytics

    return (
        <div className="flex flex-col gap-y-6 p-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <Heading level="h1">Nexel User Analytics</Heading>
                    <p className="text-ui-fg-subtle text-sm mt-1">
                        Comprehensive insights into your telecom customers
                    </p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard
                    icon={<Users className="text-ui-fg-interactive" />}
                    title="Total Users"
                    value={summary.total_users}
                    subtitle={`${summary.active_users} active, ${summary.suspended_users} suspended`}
                    trend="neutral"
                />
                <SummaryCard
                    icon={<span className="text-2xl">💰</span>}
                    title="Total Revenue"
                    value={`₹${(summary.total_revenue / 100).toLocaleString()}`}
                    subtitle={`Avg LTV: ₹${(summary.avg_ltv / 100).toFixed(0)}`}
                    trend="up"
                />
                <SummaryCard
                    icon={<span className="text-2xl">📊</span>}
                    title="Data Usage"
                    value={`${summary.total_data_usage_gb} GB`}
                    subtitle="Total consumed"
                    trend="up"
                />
                <SummaryCard
                    icon={<span className="text-2xl">⚠️</span>}
                    title="High Risk"
                    value={summary.high_risk_users}
                    subtitle="Users need attention"
                    trend={summary.high_risk_users > 0 ? "down" : "neutral"}
                />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <label className="text-sm text-ui-fg-subtle">Status:</label>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="rounded-md border border-ui-border-base bg-ui-bg-base px-3 py-2 text-sm"
                    >
                        <option value="all">All</option>
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                        <option value="barred">Barred</option>
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    <label className="text-sm text-ui-fg-subtle">Sort by:</label>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="rounded-md border border-ui-border-base bg-ui-bg-base px-3 py-2 text-sm"
                    >
                        <option value="revenue_desc">Revenue (High to Low)</option>
                        <option value="usage_desc">Usage (High to Low)</option>
                        <option value="recent">Recent Recharge</option>
                        <option value="risk_desc">Risk (High to Low)</option>
                    </select>
                </div>
            </div>

            {/* Users Table */}
            <Container>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="border-b border-ui-border-base">
                            <tr className="text-left text-sm text-ui-fg-subtle">
                                <th className="pb-3 font-medium">Phone Number</th>
                                <th className="pb-3 font-medium">Tier</th>
                                <th className="pb-3 font-medium">Status</th>
                                <th className="pb-3 font-medium">Data Usage</th>
                                <th className="pb-3 font-medium">Revenue</th>
                                <th className="pb-3 font-medium">LTV</th>
                                <th className="pb-3 font-medium">Risk</th>
                                <th className="pb-3 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user: any) => (
                                <UserRow key={user.subscription_id} user={user} />
                            ))}
                        </tbody>
                    </table>
                </div>
            </Container>
        </div>
    )
}

// Summary Card Component
const SummaryCard = ({ icon, title, value, subtitle, trend }: any) => {
    return (
        <Container className="p-4">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        {icon}
                        <span className="text-sm text-ui-fg-subtle">{title}</span>
                    </div>
                    <div className="text-2xl font-semibold text-ui-fg-base">{value}</div>
                    <div className="text-xs text-ui-fg-subtle mt-1">{subtitle}</div>
                </div>
            </div>
        </Container>
    )
}

// User Row Component
const UserRow = ({ user }: any) => {
    const getRiskColor = (level: string) => {
        switch (level) {
            case "high":
                return "bg-ui-tag-red-bg text-ui-tag-red-text"
            case "medium":
                return "bg-ui-tag-orange-bg text-ui-tag-orange-text"
            default:
                return "bg-ui-tag-green-bg text-ui-tag-green-text"
        }
    }

    const getTierColor = (tier: string) => {
        switch (tier) {
            case "platinum":
                return "bg-ui-tag-purple-bg text-ui-tag-purple-text"
            case "gold":
                return "bg-ui-tag-orange-bg text-ui-tag-orange-text"
            default:
                return "bg-ui-tag-neutral-bg text-ui-tag-neutral-text"
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case "active":
                return "bg-ui-tag-green-bg text-ui-tag-green-text"
            case "suspended":
                return "bg-ui-tag-orange-bg text-ui-tag-orange-text"
            default:
                return "bg-ui-tag-red-bg text-ui-tag-red-text"
        }
    }

    return (
        <tr className="border-b border-ui-border-base hover:bg-ui-bg-subtle-hover">
            <td className="py-4">
                <div className="font-medium text-ui-fg-base">{user.phone_number}</div>
                <div className="text-xs text-ui-fg-subtle">{user.subscription_id.slice(0, 12)}...</div>
            </td>
            <td className="py-4">
                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${getTierColor(user.tier)}`}>
                    {user.tier}
                </span>
            </td>
            <td className="py-4">
                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${getStatusColor(user.status)}`}>
                    {user.status}
                </span>
            </td>
            <td className="py-4">
                <div className="text-sm text-ui-fg-base">
                    {((user.current_period.data_used_mb || 0) / 1024).toFixed(2)} GB
                </div>
                <div className="text-xs text-ui-fg-subtle">
                    {user.current_period.data_percentage}% used
                </div>
            </td>
            <td className="py-4">
                <div className="text-sm font-medium text-ui-fg-base">
                    {user.revenue.formatted.total}
                </div>
            </td>
            <td className="py-4">
                <div className="text-sm text-ui-fg-base">
                    {user.revenue.formatted.ltv}
                </div>
            </td>
            <td className="py-4">
                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${getRiskColor(user.risk_assessment.level)}`}>
                    {user.risk_assessment.level} ({user.risk_assessment.score})
                </span>
            </td>
            <td className="py-4">
                <a
                    href={`/app/user-analytics/${user.subscription_id}`}
                    className="text-sm text-ui-fg-interactive hover:text-ui-fg-interactive-hover"
                >
                    View Details →
                </a>
            </td>
        </tr>
    )
}

export const config = defineRouteConfig({
    label: "User Analytics",
    icon: Users,
})

export default UserAnalyticsPage
