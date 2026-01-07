import { defineRouteConfig } from "@medusajs/admin-sdk"
import { BuildingStorefront } from "@medusajs/icons"
import { Container, Heading, Badge, Button } from "@medusajs/ui"
import { useEffect, useState } from "react"

// Plan Catalog Management Page
const PlanCatalogPage = () => {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [selectedPlan, setSelectedPlan] = useState<any>(null)
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        price: "",
        data_quota_gb: "", // Changed from MB to GB
        voice_quota_type: "custom", // "unlimited" or "custom"
        voice_quota_min: "",
        validity_days: "",
        is_active: true
    })

    useEffect(() => {
        fetchPlans()
    }, [])

    const fetchPlans = async () => {
        try {
            setLoading(true)
            const response = await fetch("/admin/telecom/plans")
            const result = await response.json()
            setData(result)
        } catch (error) {
            console.error("Failed to fetch plans:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleCreatePlan = async (e: React.FormEvent) => {
        e.preventDefault()

        try {
            const voiceQuota = formData.voice_quota_type === "unlimited"
                ? 999999
                : parseInt(formData.voice_quota_min)

            const response = await fetch("/admin/telecom/plans", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    price: parseInt(formData.price) * 100, // Convert to paise
                    data_quota_mb: parseFloat(formData.data_quota_gb) * 1024, // Convert GB to MB
                    voice_quota_min: voiceQuota,
                    validity_days: parseInt(formData.validity_days)
                })
            })

            if (response.ok) {
                setShowCreateModal(false)
                setFormData({
                    name: "",
                    description: "",
                    price: "",
                    data_quota_gb: "",
                    voice_quota_type: "custom",
                    voice_quota_min: "",
                    validity_days: "",
                    is_active: true
                })
                fetchPlans() // Refresh the list
            }
        } catch (error) {
            console.error("Failed to create plan:", error)
        }
    }

    const handleEditPlan = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!selectedPlan) return

        try {
            const voiceQuota = formData.voice_quota_type === "unlimited"
                ? 999999
                : parseInt(formData.voice_quota_min)

            const response = await fetch(`/admin/telecom/plans/${selectedPlan.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    price: parseInt(formData.price) * 100,
                    data_quota_mb: parseFloat(formData.data_quota_gb) * 1024, // Convert GB to MB
                    voice_quota_min: voiceQuota,
                    validity_days: parseInt(formData.validity_days)
                })
            })

            if (response.ok) {
                setShowEditModal(false)
                setSelectedPlan(null)
                fetchPlans()
            }
        } catch (error) {
            console.error("Failed to update plan:", error)
        }
    }

    const handleToggleActive = async (plan: any) => {
        try {
            const response = await fetch(`/admin/telecom/plans/${plan.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    is_active: !plan.is_active
                })
            })

            if (response.ok) {
                fetchPlans()
            }
        } catch (error) {
            console.error("Failed to toggle plan status:", error)
        }
    }

    const openEditModal = (plan: any) => {
        setSelectedPlan(plan)
        const isUnlimited = plan.voice_quota_min >= 999999
        setFormData({
            name: plan.name,
            description: plan.description || "",
            price: (plan.price / 100).toString(),
            data_quota_gb: (plan.data_quota_mb / 1024).toString(), // Convert MB to GB
            voice_quota_type: isUnlimited ? "unlimited" : "custom",
            voice_quota_min: isUnlimited ? "" : plan.voice_quota_min.toString(),
            validity_days: plan.validity_days.toString(),
            is_active: plan.is_active
        })
        setShowEditModal(true)
    }

    const handleDeletePlan = async () => {
        if (!selectedPlan) return

        try {
            const response = await fetch(`/admin/telecom/plans/${selectedPlan.id}`, {
                method: "DELETE"
            })

            if (response.ok) {
                setShowDeleteModal(false)
                setSelectedPlan(null)
                fetchPlans()
            }
        } catch (error) {
            console.error("Failed to delete plan:", error)
        }
    }

    if (loading) {
        return (
            <Container className="p-8">
                <div className="flex items-center justify-center h-64">
                    <div className="text-ui-fg-subtle">Loading plans...</div>
                </div>
            </Container>
        )
    }

    if (!data) {
        return (
            <Container className="p-8">
                <div className="text-ui-fg-subtle">Failed to load plans</div>
            </Container>
        )
    }

    const { plans, summary } = data

    return (
        <div className="flex flex-col gap-y-6 p-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <Heading level="h1">Plan Catalog</Heading>
                    <p className="text-ui-fg-subtle text-sm mt-1">
                        Manage telecom plans and pricing
                    </p>
                </div>
                <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                    Create New Plan
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Container className="p-4">
                    <div className="text-sm text-ui-fg-subtle mb-1">Total Plans</div>
                    <div className="text-2xl font-bold text-ui-fg-base">{summary.total_plans}</div>
                </Container>
                <Container className="p-4">
                    <div className="text-sm text-ui-fg-subtle mb-1">Active Plans</div>
                    <div className="text-2xl font-bold text-ui-tag-green-text">{summary.active_plans}</div>
                </Container>
                <Container className="p-4">
                    <div className="text-sm text-ui-fg-subtle mb-1">Total Subscribers</div>
                    <div className="text-2xl font-bold text-ui-fg-base">{summary.total_subscribers}</div>
                </Container>
                <Container className="p-4">
                    <div className="text-sm text-ui-fg-subtle mb-1">Total Revenue</div>
                    <div className="text-2xl font-bold text-ui-tag-green-text">
                        ₹{(summary.total_revenue / 100).toLocaleString()}
                    </div>
                </Container>
            </div>

            {/* Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {plans.map((plan: any) => (
                    <PlanCard
                        key={plan.id}
                        plan={plan}
                        onEdit={openEditModal}
                        onToggleActive={handleToggleActive}
                        onDelete={(plan: any) => {
                            setSelectedPlan(plan)
                            setShowDeleteModal(true)
                        }}
                    />
                ))}
            </div>

            {/* Create Plan Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <Heading level="h2">Create New Plan</Heading>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="text-ui-fg-subtle hover:text-ui-fg-base"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreatePlan} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-ui-fg-base mb-1">
                                    Plan Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full rounded-md border border-ui-border-base bg-ui-bg-base px-3 py-2 text-sm"
                                    placeholder="e.g., Unlimited 5G"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-ui-fg-base mb-1">
                                    Description
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full rounded-md border border-ui-border-base bg-ui-bg-base px-3 py-2 text-sm"
                                    placeholder="Plan description"
                                    rows={3}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-ui-fg-base mb-1">
                                        Price (₹) *
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                        className="w-full rounded-md border border-ui-border-base bg-ui-bg-base px-3 py-2 text-sm"
                                        placeholder="299"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-ui-fg-base mb-1">
                                        Validity (days) *
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        value={formData.validity_days}
                                        onChange={(e) => setFormData({ ...formData, validity_days: e.target.value })}
                                        className="w-full rounded-md border border-ui-border-base bg-ui-bg-base px-3 py-2 text-sm"
                                        placeholder="28"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-ui-fg-base mb-1">
                                        Data Quota (GB) *
                                    </label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        required
                                        value={formData.data_quota_gb}
                                        onChange={(e) => setFormData({ ...formData, data_quota_gb: e.target.value })}
                                        className="w-full rounded-md border border-ui-border-base bg-ui-bg-base px-3 py-2 text-sm"
                                        placeholder="50"
                                    />
                                    <p className="text-xs text-ui-fg-subtle mt-1">e.g., 1.5 for 1.5GB, 50 for 50GB</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-ui-fg-base mb-1">
                                        Voice Quota *
                                    </label>
                                    <select
                                        value={formData.voice_quota_type}
                                        onChange={(e) => setFormData({ ...formData, voice_quota_type: e.target.value })}
                                        className="w-full rounded-md border border-ui-border-base bg-ui-bg-base px-3 py-2 text-sm"
                                    >
                                        <option value="custom">Custom Minutes</option>
                                        <option value="unlimited">Unlimited</option>
                                    </select>
                                    {formData.voice_quota_type === "custom" && (
                                        <input
                                            type="number"
                                            required
                                            value={formData.voice_quota_min}
                                            onChange={(e) => setFormData({ ...formData, voice_quota_min: e.target.value })}
                                            className="w-full rounded-md border border-ui-border-base bg-ui-bg-base px-3 py-2 text-sm mt-2"
                                            placeholder="3000"
                                        />
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="rounded border-ui-border-base"
                                />
                                <label htmlFor="is_active" className="text-sm text-ui-fg-base">
                                    Activate plan immediately
                                </label>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1"
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" variant="primary" className="flex-1">
                                    Create Plan
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Plan Modal */}
            {showEditModal && selectedPlan && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <Heading level="h2">Edit Plan: {selectedPlan.name}</Heading>
                            <button
                                onClick={() => {
                                    setShowEditModal(false)
                                    setSelectedPlan(null)
                                }}
                                className="text-ui-fg-subtle hover:text-ui-fg-base"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleEditPlan} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-ui-fg-base mb-1">
                                    Plan Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full rounded-md border border-ui-border-base bg-ui-bg-base px-3 py-2 text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-ui-fg-base mb-1">
                                    Description
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full rounded-md border border-ui-border-base bg-ui-bg-base px-3 py-2 text-sm"
                                    rows={3}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-ui-fg-base mb-1">
                                        Price (₹) *
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                        className="w-full rounded-md border border-ui-border-base bg-ui-bg-base px-3 py-2 text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-ui-fg-base mb-1">
                                        Validity (days) *
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        value={formData.validity_days}
                                        onChange={(e) => setFormData({ ...formData, validity_days: e.target.value })}
                                        className="w-full rounded-md border border-ui-border-base bg-ui-bg-base px-3 py-2 text-sm"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-ui-fg-base mb-1">
                                        Data Quota (GB) *
                                    </label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        required
                                        value={formData.data_quota_gb}
                                        onChange={(e) => setFormData({ ...formData, data_quota_gb: e.target.value })}
                                        className="w-full rounded-md border border-ui-border-base bg-ui-bg-base px-3 py-2 text-sm"
                                    />
                                    <p className="text-xs text-ui-fg-subtle mt-1">e.g., 1.5 for 1.5GB, 50 for 50GB</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-ui-fg-base mb-1">
                                        Voice Quota *
                                    </label>
                                    <select
                                        value={formData.voice_quota_type}
                                        onChange={(e) => setFormData({ ...formData, voice_quota_type: e.target.value })}
                                        className="w-full rounded-md border border-ui-border-base bg-ui-bg-base px-3 py-2 text-sm"
                                    >
                                        <option value="custom">Custom Minutes</option>
                                        <option value="unlimited">Unlimited</option>
                                    </select>
                                    {formData.voice_quota_type === "custom" && (
                                        <input
                                            type="number"
                                            required={formData.voice_quota_type === "custom"}
                                            value={formData.voice_quota_min}
                                            onChange={(e) => setFormData({ ...formData, voice_quota_min: e.target.value })}
                                            className="w-full rounded-md border border-ui-border-base bg-ui-bg-base px-3 py-2 text-sm mt-2"
                                            placeholder="3000"
                                        />
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="edit_is_active"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="rounded border-ui-border-base"
                                />
                                <label htmlFor="edit_is_active" className="text-sm text-ui-fg-base">
                                    Plan is active
                                </label>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => {
                                        setShowEditModal(false)
                                        setSelectedPlan(null)
                                    }}
                                    className="flex-1"
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" variant="primary" className="flex-1">
                                    Update Plan
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && selectedPlan && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <div className="mb-4">
                            <Heading level="h2">Delete Plan</Heading>
                            <p className="text-sm text-ui-fg-subtle mt-2">
                                Are you sure you want to delete "{selectedPlan.name}"? This action cannot be undone.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => {
                                    setShowDeleteModal(false)
                                    setSelectedPlan(null)
                                }}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="danger"
                                onClick={handleDeletePlan}
                                className="flex-1"
                            >
                                Delete
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// Plan Card Component
const PlanCard = ({ plan, onEdit, onToggleActive, onDelete }: any) => {
    return (
        <Container className="p-6">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <div className="text-lg font-semibold text-ui-fg-base">{plan.name}</div>
                    <div className="text-xs text-ui-fg-subtle mt-1">{plan.description}</div>
                </div>
                <Badge color={plan.is_active ? "green" : "grey"}>
                    {plan.is_active ? "Active" : "Inactive"}
                </Badge>
            </div>

            <div className="space-y-3">
                {/* Price */}
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-ui-fg-base">
                        ₹{(plan.price / 100).toFixed(0)}
                    </span>
                    <span className="text-sm text-ui-fg-subtle">/ {plan.validity_days} days</span>
                </div>

                {/* Features */}
                <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">📊</span>
                        <span className="text-ui-fg-base">
                            {(plan.data_quota_mb / 1024).toFixed(1)} GB Data
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-lg">📞</span>
                        <span className="text-ui-fg-base">
                            {plan.voice_quota_min} min Voice
                        </span>
                    </div>
                </div>

                {/* Metrics */}
                <div className="pt-3 border-t border-ui-border-base">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                            <div className="text-ui-fg-subtle">Subscribers</div>
                            <div className="font-medium text-ui-fg-base">{plan.metrics.active_subscribers}</div>
                        </div>
                        <div>
                            <div className="text-ui-fg-subtle">Revenue</div>
                            <div className="font-medium text-ui-fg-base">
                                ₹{(plan.metrics.total_revenue / 100).toLocaleString()}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                    <Button
                        variant="secondary"
                        size="small"
                        className="flex-1"
                        onClick={() => onEdit(plan)}
                    >
                        Edit
                    </Button>
                    <Button
                        variant="secondary"
                        size="small"
                        className="flex-1"
                        onClick={() => onToggleActive(plan)}
                    >
                        {plan.is_active ? "Deactivate" : "Activate"}
                    </Button>
                </div>
                <Button
                    variant="danger"
                    size="small"
                    className="w-full"
                    onClick={() => onDelete(plan)}
                >
                    Delete Plan
                </Button>
            </div>
        </Container>
    )
}

export const config = defineRouteConfig({
    label: "Plan Catalog",
    icon: BuildingStorefront,
})

export default PlanCatalogPage
