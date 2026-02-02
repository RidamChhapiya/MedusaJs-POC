import {
    capturePaymentWorkflow,
    createOrderFulfillmentWorkflow,
    markOrderFulfillmentAsDeliveredWorkflow
} from "@medusajs/core-flows"
import { MedusaContainer } from "@medusajs/framework/types"

export type RunDeliveryOptions = {
    doCapture?: boolean
    doShip?: boolean
    doDeliver?: boolean
    actorId?: string
}

export type RunDeliveryResult = {
    results: { capture?: string; ship?: string; deliver?: string; errors?: string[] }
    errors: string[]
}

const ORDER_FIELDS = [
    "id",
    "created_at",
    "items.id",
    "items.quantity",
    "payment_collections.id",
    "fulfillments.id",
    "fulfillments.shipped_at",
    "fulfillments.delivered_at",
    "shipping_methods.id",
    "shipping_methods.shipping_option_id"
] as const

/**
 * Run delivery actions for an order: capture payment, create fulfillment (ship), mark as delivered.
 * Used by both admin and store complete-delivery APIs.
 */
export async function runOrderDeliveryActions(
    scope: MedusaContainer,
    orderId: string,
    options: RunDeliveryOptions = {}
): Promise<RunDeliveryResult> {
    const doCapture = options.doCapture !== false
    const doShip = options.doShip !== false
    const doDeliver = options.doDeliver !== false
    const query = scope.resolve("query")
    const paymentModule = scope.resolve("payment")
    const results: { capture?: string; ship?: string; deliver?: string; errors?: string[] } = {}
    const errors: string[] = []

    const { data: orders } = await query.graph({
        entity: "order",
        fields: [...ORDER_FIELDS],
        filters: { id: orderId }
    })

    if (!orders?.length) {
        return { results: {}, errors: ["Order not found"] }
    }

    const order = orders[0]

    if (doCapture && order.payment_collections?.length) {
        const paymentCollectionId = order.payment_collections[0].id
        const payments = await paymentModule.listPayments({
            payment_collection_id: [paymentCollectionId]
        })
        const toCapture = payments.filter((p: { captured_at?: Date | null }) => !p.captured_at)
        for (const payment of toCapture) {
            try {
                await capturePaymentWorkflow(scope).run({
                    input: { payment_id: payment.id, captured_by: options.actorId }
                })
                results.capture = `Captured payment ${payment.id}`
            } catch (e: any) {
                errors.push(`Capture: ${e?.message || String(e)}`)
            }
        }
        if (toCapture.length === 0 && payments.length > 0) {
            results.capture = "Payment already captured"
        } else if (!payments.length) {
            results.capture = "No payment to capture (use mark-paid first if needed)"
        }
    } else if (doCapture) {
        results.capture = "No payment collection on order (use mark-paid first if needed)"
    }

    if (doShip && order.items?.length) {
        try {
            await createOrderFulfillmentWorkflow(scope).run({
                input: {
                    order_id: orderId,
                    items: order.items.map((i: { id: string; quantity: number }) => ({
                        id: i.id,
                        quantity: i.quantity
                    }))
                }
            })
            results.ship = "Fulfillment created (marked as shipped)"
        } catch (e: any) {
            const msg = e?.message || String(e)
            if (msg.includes("already") || msg.includes("fulfilled") || msg.includes("No items")) {
                results.ship = "Already fulfilled or no items to fulfill"
            } else {
                errors.push(`Ship: ${msg}`)
            }
        }
    } else if (doShip) {
        results.ship = "No items to fulfill"
    }

    if (doDeliver && order.fulfillments?.length) {
        const toDeliver = order.fulfillments.filter(
            (f: { shipped_at?: Date | null; delivered_at?: Date | null }) =>
                f.shipped_at && !f.delivered_at
        )
        for (const f of toDeliver) {
            try {
                await markOrderFulfillmentAsDeliveredWorkflow(scope).run({
                    input: { orderId, fulfillmentId: f.id }
                })
                results.deliver = `Marked fulfillment ${f.id} as delivered`
            } catch (e: any) {
                errors.push(`Deliver: ${e?.message || String(e)}`)
            }
        }
        if (toDeliver.length === 0 && order.fulfillments.length > 0) {
            results.deliver =
                "No fulfillments to mark as delivered (already delivered or not shipped)"
        }
    } else if (doDeliver) {
        results.deliver = "No fulfillments on order"
    }

    if (errors.length) {
        results.errors = errors
    }

    return { results, errors }
}
