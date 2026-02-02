import { HttpTypes } from "@medusajs/types"
import { Text } from "@medusajs/ui"

type OrderDetailsProps = {
  order: HttpTypes.StoreOrder
  showStatus?: boolean
}

const OrderDetails = ({ order, showStatus }: OrderDetailsProps) => {
  return (
    <div className="rounded-xl border border-ui-border-base bg-ui-bg-subtle/50 p-5">
      <h3 className="text-base font-semibold text-ui-fg-base mb-4">Order information</h3>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <div>
          <dt className="text-ui-fg-muted font-medium">Order number</dt>
          <dd className="text-ui-fg-base mt-0.5 font-medium" data-testid="order-id">
            #{order.display_id}
          </dd>
        </div>
        <div>
          <dt className="text-ui-fg-muted font-medium">Order date</dt>
          <dd className="text-ui-fg-base mt-0.5" data-testid="order-date">
            {new Date(order.created_at).toLocaleDateString(undefined, { dateStyle: "medium" })}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-ui-fg-muted font-medium">Email</dt>
          <dd className="text-ui-fg-base mt-0.5" data-testid="order-email">
            {order.email ?? "—"}
          </dd>
        </div>
        {showStatus && (
          <>
            <div>
              <dt className="text-ui-fg-muted font-medium">Fulfillment status</dt>
              <dd className="text-ui-fg-base mt-0.5" data-testid="order-status">
                {order.fulfillment_status
                  ? order.fulfillment_status.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ")
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-ui-fg-muted font-medium">Payment status</dt>
              <dd className="text-ui-fg-base mt-0.5" data-testid="order-payment-status">
                {order.payment_status
                  ? order.payment_status.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ")
                  : "—"}
              </dd>
            </div>
          </>
        )}
      </dl>
    </div>
  )
}

export default OrderDetails
