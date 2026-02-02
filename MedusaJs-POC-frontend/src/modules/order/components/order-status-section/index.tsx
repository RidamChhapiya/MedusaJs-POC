import { HttpTypes } from "@medusajs/types"
import { Text } from "@medusajs/ui"

type OrderStatusSectionProps = {
  order: HttpTypes.StoreOrder
}

function formatStatus(str: string) {
  const formatted = str.split("_").join(" ")
  return formatted.slice(0, 1).toUpperCase() + formatted.slice(1)
}

function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—"
  const date = new Date(d)
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export default function OrderStatusSection({ order }: OrderStatusSectionProps) {
  const fulfillments = order.fulfillments ?? []
  const firstFulfillment = fulfillments[0]
  const shippedAt = firstFulfillment?.shipped_at
  const deliveredAt = firstFulfillment?.delivered_at
  const packedAt = firstFulfillment?.packed_at
  const fulfillmentData = (firstFulfillment?.data ?? {}) as Record<string, unknown>
  const trackingNumber = (fulfillmentData.tracking_number as string) ?? ""
  const trackingUrl = (fulfillmentData.tracking_url as string) ?? (fulfillmentData.tracking_link as string) ?? ""

  return (
    <div className="rounded-xl border border-ui-border-base bg-ui-bg-subtle/50 p-5">
      <h3 className="text-base font-semibold text-ui-fg-base mb-4">Order status</h3>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
        <div>
          <dt className="text-ui-fg-muted font-medium">Fulfillment</dt>
          <dd className="text-ui-fg-base mt-0.5" data-testid="order-fulfillment-status">
            {formatStatus(order.fulfillment_status ?? "not_fulfilled")}
          </dd>
        </div>
        <div>
          <dt className="text-ui-fg-muted font-medium">Payment</dt>
          <dd className="text-ui-fg-base mt-0.5" data-testid="order-payment-status">
            {formatStatus(order.payment_status ?? "not_paid")}
          </dd>
        </div>
        {packedAt && (
          <div>
            <dt className="text-ui-fg-muted font-medium">Packed on</dt>
            <dd className="text-ui-fg-base mt-0.5">{formatDate(packedAt)}</dd>
          </div>
        )}
        {shippedAt && (
          <div>
            <dt className="text-ui-fg-muted font-medium">Shipped on</dt>
            <dd className="text-ui-fg-base mt-0.5" data-testid="order-shipped-at">
              {formatDate(shippedAt)}
            </dd>
          </div>
        )}
        {deliveredAt && (
          <div>
            <dt className="text-ui-fg-muted font-medium">Delivered on</dt>
            <dd className="text-ui-fg-base mt-0.5">{formatDate(deliveredAt)}</dd>
          </div>
        )}
        {trackingNumber && (
          <div className="sm:col-span-2">
            <dt className="text-ui-fg-muted font-medium">Tracking</dt>
            <dd className="text-ui-fg-base mt-0.5 flex flex-wrap items-center gap-2">
              <span className="font-mono text-ui-fg-subtle">{trackingNumber}</span>
              {trackingUrl && (
                <a
                  href={trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ui-fg-interactive hover:underline text-sm"
                >
                  Track shipment →
                </a>
              )}
            </dd>
          </div>
        )}
      </dl>
    </div>
  )
}
