import { SubscriberArgs, SubscriberConfig } from "@medusajs/medusa"
import TelecomCoreModuleService from "../modules/telecom-core/service"

/**
 * Order Fulfillment Subscriber
 * Activates SIM and subscription when order is fulfilled
 */
export default async function handleOrderFulfillment({
    event,
    container
}: SubscriberArgs<any>) {
    const telecomModule: TelecomCoreModuleService = container.resolve("telecom")

    try {
        const { id: fulfillment_id, order_id, metadata: fulfillmentMetadata } = event.data

        // Get order to check metadata
        const orderModule = container.resolve("order")
        const orders = await orderModule.listOrders({ id: [order_id] })
        const order = orders[0]

        if (!order) {
            console.log(`[Fulfillment] Order ${order_id} not found`)
            return
        }

        const { order_type, msisdn, subscription_id } = order.metadata || {}

        // Only process SIM purchase orders
        if (order_type !== "sim_purchase") {
            console.log(`[Fulfillment] Skipping non-SIM order ${order_id}`)
            return
        }

        console.log(`[Fulfillment] Processing SIM activation for order ${order_id}`)

        // Activate MSISDN
        if (msisdn) {
            const msisdns = await telecomModule.listMsisdnInventories({
                phone_number: msisdn
            })

            if (msisdns.length > 0) {
                await telecomModule.updateMsisdnInventories({
                    id: msisdns[0].id,
                    status: "active",
                    activated_at: new Date()
                })
                console.log(`[Fulfillment] ✅ Activated MSISDN ${msisdn}`)
            }
        }

        // Activate subscription
        if (subscription_id) {
            await telecomModule.updateSubscriptions({
                id: subscription_id,
                status: "active"
            })
            console.log(`[Fulfillment] ✅ Activated subscription ${subscription_id}`)
        }

        // Update order metadata
        await orderModule.updateOrders({
            id: order_id,
            metadata: {
                ...order.metadata,
                sim_activated: true,
                activated_at: new Date().toISOString()
            }
        })

        console.log(`[Fulfillment] ✅ SIM purchase order ${order_id} fully activated`)

    } catch (error) {
        console.error("[Fulfillment] Error activating SIM:", error)
    }
}

export const config: SubscriberConfig = {
    event: "order.fulfillment_created"
}
