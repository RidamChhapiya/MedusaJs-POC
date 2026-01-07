import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Phone } from "@medusajs/icons"
import { Container, Heading, Badge } from "@medusajs/ui"
import { useEffect, useState } from "react"

// MSISDN Inventory Management Page
const MsisdnInventoryPage = () => {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState("all")
    const [tierFilter, setTierFilter] = useState("all")
    const [searchQuery, setSearchQuery] = useState("")
    const [debouncedSearch, setDebouncedSearch] = useState("")
    const [currentPage, setCurrentPage] = useState(1)
    const [limit, setLimit] = useState(20)

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery)
            setCurrentPage(1)
        }, 500)

        return () => clearTimeout(timer)
    }, [searchQuery])

    useEffect(() => {
        fetchInventory()
    }, [statusFilter, tierFilter, debouncedSearch, currentPage, limit])

    const fetchInventory = async () => {
        try {
            setLoading(true)
            const offset = (currentPage - 1) * limit
            const params = new URLSearchParams({
                limit: limit.toString(),
                offset: offset.toString()
            })
            if (statusFilter !== "all") params.append("status", statusFilter)
            if (tierFilter !== "all") params.append("tier", tierFilter)
            if (debouncedSearch) params.append("search", debouncedSearch)

            const response = await fetch(`/admin/telecom/msisdn-inventory?${params}`)
            const result = await response.json()
            setData(result)
        } catch (error) {
            console.error("Failed to fetch MSISDN inventory:", error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <Container className="p-8">
                <div className="flex items-center justify-center h-64">
                    <div className="text-ui-fg-subtle">Loading inventory...</div>
                </div>
            </Container>
        )
    }

    if (!data) {
        return (
            <Container className="p-8">
                <div className="text-ui-fg-subtle">Failed to load inventory</div>
            </Container>
        )
    }

    const { msisdns, statistics, utilization } = data

    return (
        <div className="flex flex-col gap-y-6 p-8">
            {/* Header */}
            <div>
                <Heading level="h1">MSISDN Inventory</Heading>
                <p className="text-ui-fg-subtle text-sm mt-1">
                    Manage your phone number inventory
                </p>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard
                    icon={<span className="text-2xl">📱</span>}
                    title="Total Numbers"
                    value={statistics.total}
                />
                <StatCard
                    icon={<span className="text-2xl">✅</span>}
                    title="Available"
                    value={statistics.available}
                    color="green"
                />
                <StatCard
                    icon={<span className="text-2xl">🔒</span>}
                    title="Reserved"
                    value={statistics.reserved}
                    color="orange"
                />
                <StatCard
                    icon={<span className="text-2xl">📞</span>}
                    title="Active"
                    value={statistics.active}
                    color="blue"
                />
                <StatCard
                    icon={<span className="text-2xl">⏳</span>}
                    title="Cooling Down"
                    value={statistics.cooling_down}
                    color="purple"
                />
            </div>

            {/* Utilization */}
            <Container className="p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-sm font-medium text-ui-fg-base">Capacity Utilization</div>
                        <div className="text-xs text-ui-fg-subtle mt-1">
                            {utilization.in_use} / {utilization.total_capacity} numbers in use
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-ui-fg-base">
                        {utilization.utilization_percentage}%
                    </div>
                </div>
                <div className="mt-3 w-full bg-ui-bg-subtle rounded-full h-3">
                    <div
                        className="bg-ui-tag-blue-bg h-3 rounded-full"
                        style={{ width: `${utilization.utilization_percentage}%` }}
                    />
                </div>
            </Container>

            {/* Tier Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Container className="p-4">
                    <div className="text-sm font-medium text-ui-fg-base mb-2">Standard Tier</div>
                    <div className="text-2xl font-bold">{statistics.by_tier.standard}</div>
                </Container>
                <Container className="p-4">
                    <div className="text-sm font-medium text-ui-fg-base mb-2">Gold Tier</div>
                    <div className="text-2xl font-bold text-ui-tag-orange-text">{statistics.by_tier.gold}</div>
                </Container>
                <Container className="p-4">
                    <div className="text-sm font-medium text-ui-fg-base mb-2">Platinum Tier</div>
                    <div className="text-2xl font-bold text-ui-tag-purple-text">{statistics.by_tier.platinum}</div>
                </Container>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col gap-4">
                {/* Search Bar */}
                <div className="flex items-center gap-2">
                    <div className="relative flex-1 max-w-md">
                        <input
                            type="text"
                            placeholder="Search phone numbers..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-md border border-ui-border-base bg-ui-bg-base px-4 py-2 text-sm pl-10"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ui-fg-subtle">
                            🔍
                        </span>
                    </div>
                    {searchQuery && (
                        <button
                            onClick={() => {
                                setSearchQuery("")
                                setCurrentPage(1)
                            }}
                            className="px-3 py-2 text-sm rounded-md border border-ui-border-base bg-ui-bg-base hover:bg-ui-bg-subtle-hover"
                        >
                            Clear
                        </button>
                    )}
                </div>

                {/* Filters */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <label className="text-sm text-ui-fg-subtle">Status:</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value)
                                setCurrentPage(1)
                            }}
                            className="rounded-md border border-ui-border-base bg-ui-bg-base px-3 py-2 text-sm"
                        >
                            <option value="all">All</option>
                            <option value="available">Available</option>
                            <option value="reserved">Reserved</option>
                            <option value="active">Active</option>
                            <option value="cooling_down">Cooling Down</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="text-sm text-ui-fg-subtle">Tier:</label>
                        <select
                            value={tierFilter}
                            onChange={(e) => {
                                setTierFilter(e.target.value)
                                setCurrentPage(1)
                            }}
                            className="rounded-md border border-ui-border-base bg-ui-bg-base px-3 py-2 text-sm"
                        >
                            <option value="all">All</option>
                            <option value="standard">Standard</option>
                            <option value="gold">Gold</option>
                            <option value="platinum">Platinum</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* MSISDN Table */}
            <Container>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="border-b border-ui-border-base">
                            <tr className="text-left text-sm text-ui-fg-subtle">
                                <th className="pb-3 font-medium">Phone Number</th>
                                <th className="pb-3 font-medium">Status</th>
                                <th className="pb-3 font-medium">Tier</th>
                                <th className="pb-3 font-medium">Region</th>
                                <th className="pb-3 font-medium">Created</th>
                            </tr>
                        </thead>
                        <tbody>
                            {msisdns.map((msisdn: any) => (
                                <MsisdnRow key={msisdn.id} msisdn={msisdn} />
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center justify-between border-t border-ui-border-base px-4 py-4 mt-4">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-ui-fg-subtle">Show:</label>
                            <select
                                value={limit}
                                onChange={(e) => {
                                    setLimit(Number(e.target.value))
                                    setCurrentPage(1)
                                }}
                                className="rounded-md border border-ui-border-base bg-ui-bg-base px-3 py-2 text-sm"
                            >
                                <option value="10">10</option>
                                <option value="20">20</option>
                                <option value="50">50</option>
                                <option value="100">100</option>
                            </select>
                            <span className="text-sm text-ui-fg-subtle">per page</span>
                        </div>
                        <div className="text-sm text-ui-fg-subtle">
                            Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, statistics.total)} of {statistics.total} numbers
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(1)}
                            disabled={currentPage === 1}
                            className="px-3 py-2 text-sm rounded-md border border-ui-border-base bg-ui-bg-base hover:bg-ui-bg-subtle-hover disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            First
                        </button>
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-2 text-sm rounded-md border border-ui-border-base bg-ui-bg-base hover:bg-ui-bg-subtle-hover disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <span className="px-4 py-2 text-sm text-ui-fg-base">
                            Page {currentPage} of {Math.ceil(statistics.total / limit)}
                        </span>
                        <button
                            onClick={() => setCurrentPage(p => p + 1)}
                            disabled={currentPage >= Math.ceil(statistics.total / limit)}
                            className="px-3 py-2 text-sm rounded-md border border-ui-border-base bg-ui-bg-base hover:bg-ui-bg-subtle-hover disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                        <button
                            onClick={() => setCurrentPage(Math.ceil(statistics.total / limit))}
                            disabled={currentPage >= Math.ceil(statistics.total / limit)}
                            className="px-3 py-2 text-sm rounded-md border border-ui-border-base bg-ui-bg-base hover:bg-ui-bg-subtle-hover disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Last
                        </button>
                    </div>
                </div>
            </Container>
        </div>
    )
}

// Stat Card Component
const StatCard = ({ icon, title, value, color }: any) => {
    return (
        <Container className="p-4">
            <div className="flex items-center gap-2 mb-2">
                {icon}
                <span className="text-sm text-ui-fg-subtle">{title}</span>
            </div>
            <div className={`text-2xl font-semibold ${color ? `text-ui-tag-${color}-text` : "text-ui-fg-base"}`}>
                {value}
            </div>
        </Container>
    )
}

// MSISDN Row Component
const MsisdnRow = ({ msisdn }: any) => {
    const getStatusColor = (status: string) => {
        switch (status) {
            case "available":
                return "green"
            case "reserved":
                return "orange"
            case "active":
                return "blue"
            case "cooling_down":
                return "purple"
            default:
                return "grey"
        }
    }

    const getTierColor = (tier: string) => {
        switch (tier) {
            case "platinum":
                return "purple"
            case "gold":
                return "orange"
            default:
                return "grey"
        }
    }

    return (
        <tr className="border-b border-ui-border-base hover:bg-ui-bg-subtle-hover">
            <td className="py-4">
                <div className="font-medium text-ui-fg-base">{msisdn.phone_number}</div>
                <div className="text-xs text-ui-fg-subtle">{msisdn.id.slice(0, 12)}...</div>
            </td>
            <td className="py-4">
                <Badge color={getStatusColor(msisdn.status)}>
                    {msisdn.status}
                </Badge>
            </td>
            <td className="py-4">
                <Badge color={getTierColor(msisdn.tier)}>
                    {msisdn.tier}
                </Badge>
            </td>
            <td className="py-4">
                <span className="text-sm text-ui-fg-base">{msisdn.region_code}</span>
            </td>
            <td className="py-4">
                <span className="text-sm text-ui-fg-subtle">
                    {new Date(msisdn.created_at).toLocaleDateString()}
                </span>
            </td>
        </tr>
    )
}

export const config = defineRouteConfig({
    label: "MSISDN Inventory",
    icon: Phone,
})

export default MsisdnInventoryPage
