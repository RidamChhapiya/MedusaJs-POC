import { Container, Heading, Badge } from "@medusajs/ui"
import { ArrowLeft, Phone, Calendar } from "@medusajs/icons"
import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"

// Individual User Detail Page
const UserDetailPage = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const [userDetails, setUserDetails] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (id) {
            fetchUserDetails(id)
        }
    }, [id])

    const fetchUserDetails = async (subscriptionId: string) => {
        try {
            setLoading(true)
            const response = await fetch(`/admin/telecom/user-analytics/${subscriptionId}`)
            const data = await response.json()
            setUserDetails(data)
        } catch (error) {
            console.error("Failed to fetch user details:", error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <Container className="p-8">
                <div className="flex items-center justify-center h-64">
                    <div className="text-ui-fg-subtle">Loading user details...</div>
                </div>
            </Container>
        )
    }

    if (!userDetails) {
        return (
            <Container className="p-8">
                <div className="text-ui-fg-subtle">User not found</div>
            </Container>
        )
    }

    const { subscription, msisdn, usage_stats, revenue_summary, insights } = userDetails

    return (
        <div className="flex flex-col gap-y-6 p-8">
            {/* Back Button */}
            <button
                onClick={() => navigate("/user-analytics")}
                className="flex items-center gap-2 text-sm text-ui-fg-interactive hover:text-ui-fg-interactive-hover w-fit"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to User Analytics
            </button>

            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <Heading level="h1">{msisdn?.phone_number || "N/A"}</Heading>
                        <StatusBadge status={subscription.status} />
                        <TierBadge tier={msisdn?.tier || "standard"} />
                    </div>
                    <p className="text-ui-fg-subtle text-sm mt-1">
                        Customer ID: {subscription.customer_id} • Account Age: {subscription.account_age_days} days
                    </p>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                    icon={<span className="text-xl">📊</span>}
                    label="Total Data"
                    value={`${(usage_stats.total_data_mb / 1024).toFixed(2)} GB`}
                    subtitle={`Avg: ${(usage_stats.avg_data_per_month_mb / 1024).toFixed(2)} GB/month`}
                />
                <StatCard
                    icon={<Phone className="text-ui-tag-green-icon" />}
                    label="Total Voice"
                    value={`${usage_stats.total_voice_min} min`}
                    subtitle={`Avg: ${usage_stats.avg_voice_per_month_min} min/month`}
                />
                <StatCard
                    icon={<span className="text-xl">💰</span>}
                    label="Total Revenue"
                    value={`₹${(revenue_summary.total_paid / 100).toLocaleString()}`}
                    subtitle={`${revenue_summary.invoice_count} invoices`}
                />
                <StatCard
                    icon={<Calendar className="text-ui-tag-purple-icon" />}
                    label="Next Renewal"
                    value={new Date(subscription.renewal_date).toLocaleDateString()}
                    subtitle={`Billing day: ${subscription.billing_day}`}
                />
            </div>

            {/* Usage Timeline */}
            <Container>
                <div className="p-6">
                    <Heading level="h2" className="mb-4">Usage Timeline</Heading>
                    <div className="space-y-4">
                        {userDetails.usage_timeline.slice(0, 6).map((period: any, index: number) => (
                            <div key={index} className="flex items-center justify-between border-b border-ui-border-base pb-3">
                                <div className="flex-1">
                                    <div className="text-sm font-medium text-ui-fg-base">{period.period}</div>
                                    <div className="text-xs text-ui-fg-subtle">
                                        Data: {period.data_gb} GB • Voice: {period.voice_used_min} min
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <div className="w-32 bg-ui-bg-subtle rounded-full h-2 overflow-hidden">
                                        <div
                                            className="bg-ui-tag-blue-bg h-full"
                                            style={{ width: `${Math.min((period.data_used_mb / 51200) * 100, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </Container>

            {/* Revenue & Billing */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Container>
                    <div className="p-6">
                        <Heading level="h2" className="mb-4">Revenue Summary</Heading>
                        <div className="space-y-3">
                            <RevenueRow label="Total Invoiced" value={revenue_summary.total_invoiced} />
                            <RevenueRow label="Total Paid" value={revenue_summary.total_paid} status="success" />
                            <RevenueRow label="Pending" value={revenue_summary.total_pending} status="warning" />
                            <RevenueRow label="Overdue" value={revenue_summary.total_overdue} status="error" />
                            <div className="pt-3 border-t border-ui-border-base">
                                <div className="flex justify-between text-sm">
                                    <span className="text-ui-fg-subtle">Avg Invoice Value</span>
                                    <span className="font-medium">₹{(revenue_summary.avg_invoice_value / 100).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </Container>

                <Container>
                    <div className="p-6">
                        <Heading level="h2" className="mb-4">Recent Transactions</Heading>
                        <div className="space-y-3">
                            {userDetails.financial_timeline.slice(0, 5).map((txn: any, index: number) => (
                                <div key={index} className="flex items-center justify-between text-sm">
                                    <div className="flex-1">
                                        <div className="font-medium text-ui-fg-base">{txn.invoice_number}</div>
                                        <div className="text-xs text-ui-fg-subtle">
                                            {new Date(txn.date).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">{txn.formatted_amount}</span>
                                        <StatusBadge status={txn.status} size="small" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </Container>
            </div>

            {/* Services & Add-ons */}
            {(userDetails.device_contracts.length > 0 ||
                userDetails.family_plan ||
                userDetails.roaming_packages.length > 0 ||
                userDetails.insurance_policies.length > 0) && (
                    <Container>
                        <div className="p-6">
                            <Heading level="h2" className="mb-4">Services & Add-ons</Heading>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Device Contracts */}
                                {userDetails.device_contracts.length > 0 && (
                                    <div className="border border-ui-border-base rounded-lg p-4">
                                        <div className="text-sm font-medium text-ui-fg-base mb-2">Device Contracts</div>
                                        {userDetails.device_contracts.map((contract: any, index: number) => (
                                            <div key={index} className="text-xs text-ui-fg-subtle space-y-1">
                                                <div>Price: {contract.formatted.device_price}</div>
                                                <div>Installment: {contract.formatted.installment} x {contract.installment_count}</div>
                                                <div>Paid: {contract.installments_paid}/{contract.installment_count}</div>
                                                <div className="font-medium text-ui-fg-base">Remaining: {contract.formatted.remaining}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Family Plan */}
                                {userDetails.family_plan && (
                                    <div className="border border-ui-border-base rounded-lg p-4">
                                        <div className="text-sm font-medium text-ui-fg-base mb-2">Family Plan</div>
                                        <div className="text-xs text-ui-fg-subtle space-y-1">
                                            <div>Plan: {userDetails.family_plan.plan_name}</div>
                                            <div>Type: {userDetails.family_plan.member_type}</div>
                                            <div>Members: {userDetails.family_plan.total_members}/{userDetails.family_plan.max_members}</div>
                                            <div>Shared Data: {userDetails.family_plan.shared_data_quota_mb} MB</div>
                                        </div>
                                    </div>
                                )}

                                {/* Roaming */}
                                {userDetails.roaming_packages.length > 0 && (
                                    <div className="border border-ui-border-base rounded-lg p-4">
                                        <div className="text-sm font-medium text-ui-fg-base mb-2">Roaming Packages</div>
                                        {userDetails.roaming_packages.map((pkg: any, index: number) => (
                                            <div key={index} className="text-xs text-ui-fg-subtle space-y-1">
                                                <div>Destination: {pkg.destination_country}</div>
                                                <div>Validity: {pkg.validity_days} days</div>
                                                <div>Status: {pkg.status}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Insurance */}
                                {userDetails.insurance_policies.length > 0 && (
                                    <div className="border border-ui-border-base rounded-lg p-4">
                                        <div className="text-sm font-medium text-ui-fg-base mb-2">Device Insurance</div>
                                        {userDetails.insurance_policies.map((ins: any, index: number) => (
                                            <div key={index} className="text-xs text-ui-fg-subtle space-y-1">
                                                <div>Coverage: {ins.coverage_type}</div>
                                                <div>Premium: ₹{(ins.monthly_premium / 100).toFixed(2)}/month</div>
                                                <div>Claims: {ins.claims_made}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </Container>
                )}

            {/* Behavioral Insights */}
            <Container>
                <div className="p-6">
                    <Heading level="h2" className="mb-4">Behavioral Insights</Heading>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <InsightCard label="Segment" value={insights.customer_segment} />
                        <InsightCard label="Usage Pattern" value={insights.usage_pattern} />
                        <InsightCard label="Payment" value={insights.payment_reliability} />
                        <InsightCard label="Churn Risk" value={insights.churn_risk} alert={insights.churn_risk !== "low"} />
                    </div>

                    {insights.upsell_opportunities && insights.upsell_opportunities.length > 0 && (
                        <div className="mt-4 p-4 bg-ui-bg-subtle rounded-lg">
                            <div className="text-sm font-medium text-ui-fg-base mb-2">💡 Upsell Opportunities</div>
                            <ul className="space-y-1">
                                {insights.upsell_opportunities.map((opp: string, index: number) => (
                                    <li key={index} className="text-xs text-ui-fg-subtle">• {opp}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </Container>
        </div>
    )
}

// Helper Components
const StatusBadge = ({ status, size = "default" }: any) => {
    const colors: any = {
        active: "green",
        suspended: "orange",
        barred: "red",
        paid: "green",
        pending: "orange",
        overdue: "red"
    }

    return (
        <Badge color={colors[status] || "grey"} size={size}>
            {status}
        </Badge>
    )
}

const TierBadge = ({ tier }: any) => {
    const colors: any = {
        platinum: "purple",
        gold: "orange",
        standard: "grey"
    }

    return (
        <Badge color={colors[tier] || "grey"}>
            {tier}
        </Badge>
    )
}

const StatCard = ({ icon, label, value, subtitle }: any) => {
    return (
        <div className="border border-ui-border-base rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
                {icon}
                <span className="text-xs text-ui-fg-subtle">{label}</span>
            </div>
            <div className="text-lg font-semibold text-ui-fg-base">{value}</div>
            <div className="text-xs text-ui-fg-subtle mt-1">{subtitle}</div>
        </div>
    )
}

const RevenueRow = ({ label, value, status }: any) => {
    const colors: any = {
        success: "text-ui-tag-green-text",
        warning: "text-ui-tag-orange-text",
        error: "text-ui-tag-red-text"
    }

    return (
        <div className="flex justify-between text-sm">
            <span className="text-ui-fg-subtle">{label}</span>
            <span className={`font-medium ${status ? colors[status] : ""}`}>
                ₹{(value / 100).toLocaleString()}
            </span>
        </div>
    )
}

const InsightCard = ({ label, value, alert }: any) => {
    return (
        <div className={`border rounded-lg p-3 ${alert ? "border-ui-tag-red-border bg-ui-tag-red-bg" : "border-ui-border-base"}`}>
            <div className="text-xs text-ui-fg-subtle mb-1">{label}</div>
            <div className={`text-sm font-medium capitalize ${alert ? "text-ui-tag-red-text" : "text-ui-fg-base"}`}>
                {value}
                {alert && <span className="ml-1">⚠️</span>}
            </div>
        </div>
    )
}

export default UserDetailPage
