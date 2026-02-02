import type { SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

const ORDER_WEBHOOK_URL = process.env.ORDER_WEBHOOK_URL || process.env.X_SERVICE_URL

/**
 * Notify X Service (Order Webhook) Subscriber
 *
 * Listens for order.placed. When an order is placed (checkout complete, recharge, SIMs, accessories),
 * loads the order with items and shipping address, then POSTs a summary to an external service X
 * (e.g. for testing: a service that displays order name, products, where to deliver, etc.).
 *
 * Payload sent to X: order_id, display_id, email, created_at, items[], shipping_address.
 * If ORDER_WEBHOOK_URL or X_SERVICE_URL is not set, the subscriber does nothing.
 */
export default async function notifyOrderToXService({
    event: { data },
    container,
}: {
    event: { data: { id: string } }
    container: any
}) {
    const url = ORDER_WEBHOOK_URL
    if (!url) {
        return
    }

    const orderId = data.id

    try {
        const query = container.resolve(ContainerRegistrationKeys.QUERY)
        const orderData = await query.graph({
            entity: "order",
            fields: [
                "id",
                "display_id",
                "email",
                "created_at",
                "items.id",
                "items.title",
                "items.quantity",
                "items.variant.*",
                "shipping_address.*",
            ],
            filters: { id: orderId },
        })

        if (!orderData?.data?.length) {
            console.warn(`[OrderWebhook] Order ${orderId} not found, skipping X service notify`)
            return
        }

        const order = orderData.data[0]
        const items = (order.items || []).map((item: any) => ({
            id: item.id,
            title: item.title,
            quantity: item.quantity,
            variant_title: item.variant?.title ?? null,
        }))

        const payload = {
            event: "order.placed",
            order_id: order.id,
            display_id: order.display_id ?? null,
            email: order.email ?? null,
            created_at: order.created_at,
            items,
            shipping_address: order.shipping_address ?? null,
        }

        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        })

        if (!res.ok) {
            console.error(
                `[OrderWebhook] X service returned ${res.status} for order ${orderId}:`,
                await res.text().catch(() => "")
            )
            return
        }
        console.log(`[OrderWebhook] Notified X service for order ${orderId} (display_id: ${order.display_id ?? "n/a"})`)
    } catch (err) {
        console.error(`[OrderWebhook] Failed to notify X service for order ${orderId}:`, err)
        // Do not rethrow: order placement must succeed; webhook is best-effort
    }
}

export const config: SubscriberConfig = {
    event: "order.placed",
    context: {
        subscriberId: "notify-order-to-x-service",
    },
}
