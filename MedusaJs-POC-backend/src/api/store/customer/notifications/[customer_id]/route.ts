import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import TelecomCoreModuleService from "../../../../../modules/telecom-core/service"

/**
 * Notifications API
 * GET /store/customer/notifications/:customer_id
 * 
 * Get customer notifications:
 * - Usage alerts
 * - Renewal reminders
 * - Payment confirmations
 * - Service updates
 */
export async function GET(
    req: MedusaRequest<{ customer_id: string }>,
    res: MedusaResponse
) {
    const telecomModule: TelecomCoreModuleService = req.scope.resolve("telecom")
    const { customer_id } = req.params

    try {
        const notifications = []

        // Get all subscriptions
        const subscriptions = await telecomModule.listSubscriptions({
            customer_id
        })

        // Generate notifications based on subscription status
        for (const sub of subscriptions) {
            const counters = await telecomModule.listUsageCounters({
                subscription_id: sub.id
            })
            const counter = counters[0]

            if (counter) {
                // Data usage alerts
                const dataPercent = counter.data_quota_mb > 0
                    ? (counter.data_used_mb / counter.data_quota_mb) * 100
                    : 0

                if (dataPercent > 90) {
                    notifications.push({
                        id: `data-alert-${sub.id}`,
                        type: "usage_alert",
                        severity: "high",
                        title: "Data Limit Reached",
                        message: `You've used ${Math.round(dataPercent)}% of your data for ${sub.msisdn}`,
                        action: {
                            label: "Recharge Now",
                            url: "/recharge"
                        },
                        created_at: new Date(),
                        read: false
                    })
                } else if (dataPercent > 70) {
                    notifications.push({
                        id: `data-warning-${sub.id}`,
                        type: "usage_warning",
                        severity: "medium",
                        title: "Data Usage Warning",
                        message: `You've used ${Math.round(dataPercent)}% of your data for ${sub.msisdn}`,
                        action: {
                            label: "View Usage",
                            url: "/dashboard"
                        },
                        created_at: new Date(),
                        read: false
                    })
                }

                // Renewal reminders
                const daysRemaining = Math.ceil(
                    (new Date(sub.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                )

                if (daysRemaining <= 3 && daysRemaining > 0) {
                    notifications.push({
                        id: `renewal-${sub.id}`,
                        type: "renewal_reminder",
                        severity: "medium",
                        title: "Plan Expiring Soon",
                        message: `Your plan for ${sub.msisdn} expires in ${daysRemaining} days`,
                        action: {
                            label: sub.auto_renew ? "Manage Auto-Renew" : "Renew Now",
                            url: "/subscriptions"
                        },
                        created_at: new Date(),
                        read: false
                    })
                }
            }
        }

        // Get recent invoices for payment confirmations
        const recentInvoices = await telecomModule.listInvoices({
            customer_id
        })

        const last24Hours = Date.now() - (24 * 60 * 60 * 1000)
        recentInvoices
            .filter(inv => new Date(inv.created_at).getTime() > last24Hours)
            .forEach(inv => {
                notifications.push({
                    id: `payment-${inv.id}`,
                    type: "payment_confirmation",
                    severity: "low",
                    title: "Payment Successful",
                    message: `Payment of ₹${inv.total_amount / 100} received for invoice ${inv.invoice_number}`,
                    action: {
                        label: "View Invoice",
                        url: `/invoices/${inv.id}`
                    },
                    created_at: inv.created_at,
                    read: false
                })
            })

        // Sort by created_at desc
        notifications.sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )

        return res.json({
            notifications,
            unread_count: notifications.filter(n => !n.read).length
        })

    } catch (error) {
        console.error("[Notifications] Error:", error)
        return res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to fetch notifications"
        })
    }
}
