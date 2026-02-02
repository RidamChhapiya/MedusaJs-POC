import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"

type OrderSummaryProps = {
  order: HttpTypes.StoreOrder
}

const OrderSummary = ({ order }: OrderSummaryProps) => {
  const getAmount = (amount?: number | null) => {
    if (amount == null || amount === 0) return "—"
    return convertToLocale({
      amount,
      currency_code: order.currency_code,
    })
  }

  return (
    <div className="rounded-xl border border-ui-border-base bg-ui-bg-subtle/50 p-5">
      <h3 className="text-base font-semibold text-ui-fg-base mb-4">Order summary</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between text-ui-fg-base">
          <span>Subtotal</span>
          <span>{getAmount(order.subtotal)}</span>
        </div>
        {order.discount_total != null && order.discount_total > 0 && (
          <div className="flex justify-between text-ui-fg-base">
            <span>Discount</span>
            <span className="text-ui-fg-positive">− {getAmount(order.discount_total)}</span>
          </div>
        )}
        {order.gift_card_total != null && order.gift_card_total > 0 && (
          <div className="flex justify-between text-ui-fg-base">
            <span>Gift card</span>
            <span className="text-ui-fg-positive">− {getAmount(order.gift_card_total)}</span>
          </div>
        )}
        <div className="flex justify-between text-ui-fg-base">
          <span>Shipping</span>
          <span>{getAmount(order.shipping_total)}</span>
        </div>
        <div className="flex justify-between text-ui-fg-base">
          <span>Taxes</span>
          <span>{getAmount(order.tax_total)}</span>
        </div>
        <div className="border-t border-ui-border-base pt-3 mt-3 flex justify-between text-base font-semibold text-ui-fg-base">
          <span>Total</span>
          <span>{getAmount(order.total)}</span>
        </div>
      </div>
    </div>
  )
}

export default OrderSummary
