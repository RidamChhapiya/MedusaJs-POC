import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import { Text } from "@medusajs/ui"

type ShippingDetailsProps = {
  order: HttpTypes.StoreOrder
}

const ShippingDetails = ({ order }: ShippingDetailsProps) => {
  const address = order.shipping_address
  const shippingMethod = (order.shipping_methods ?? [])[0]
  const hasAddress = address?.address_1 || address?.city || address?.postal_code

  return (
    <div className="rounded-xl border border-ui-border-base bg-ui-bg-subtle/50 p-5">
      <h3 className="text-base font-semibold text-ui-fg-base mb-4">Delivery</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
        <div data-testid="shipping-address-summary">
          <p className="text-ui-fg-muted font-medium mb-2">Shipping address</p>
          {hasAddress ? (
            <div className="text-ui-fg-base space-y-0.5">
              <p>
                {address?.first_name} {address?.last_name}
              </p>
              {address?.address_1 && <p>{address.address_1}</p>}
              {address?.address_2 && <p>{address.address_2}</p>}
              <p>
                {[address?.postal_code, address?.city].filter(Boolean).join(", ")}
                {address?.province && `, ${address.province}`}
              </p>
              {address?.country_code && (
                <p className="uppercase">{address.country_code}</p>
              )}
            </div>
          ) : (
            <p className="text-ui-fg-muted">—</p>
          )}
        </div>

        <div data-testid="shipping-contact-summary">
          <p className="text-ui-fg-muted font-medium mb-2">Contact</p>
          <div className="text-ui-fg-base space-y-0.5">
            {address?.phone ? <p>{address.phone}</p> : null}
            <p>{order.email ?? "—"}</p>
          </div>
        </div>

        <div data-testid="shipping-method-summary">
          <p className="text-ui-fg-muted font-medium mb-2">Shipping method</p>
          {shippingMethod ? (
            <div className="text-ui-fg-base">
              <p>{(shippingMethod as { name?: string }).name ?? "Standard"}</p>
              <p className="text-ui-fg-subtle mt-0.5">
                {convertToLocale({
                  amount: (shippingMethod as { total?: number }).total ?? 0,
                  currency_code: order.currency_code,
                })}
              </p>
            </div>
          ) : (
            <p className="text-ui-fg-muted">—</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default ShippingDetails
