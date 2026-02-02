import { listCartShippingMethods } from "@lib/data/fulfillment"
import { listCartPaymentMethods } from "@lib/data/payment"
import { HttpTypes } from "@medusajs/types"
import Addresses from "@modules/checkout/components/addresses"
import Payment from "@modules/checkout/components/payment"
import Review from "@modules/checkout/components/review"
import Shipping from "@modules/checkout/components/shipping"

export default async function CheckoutForm({
  cart,
  customer,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
}) {
  if (!cart) {
    return null
  }

  const shippingMethods = await listCartShippingMethods(cart.id)
  const allPaymentMethods = await listCartPaymentMethods(cart.region?.id ?? "")

  if (!shippingMethods || !allPaymentMethods) {
    return null
  }

  // Only show Credit card (Stripe) and Manual – hide Bancontact, BLIK, iDEAL, etc.
  const PAYMENT_IDS_TO_SHOW = ["pp_stripe_stripe", "pp_system_default"]
  const paymentMethods = allPaymentMethods.filter((p: { id?: string }) =>
    PAYMENT_IDS_TO_SHOW.includes(p?.id ?? "")
  )

  return (
    <div className="w-full grid grid-cols-1 gap-y-8">
      <Addresses cart={cart} customer={customer} />

      <Shipping cart={cart} availableShippingMethods={shippingMethods} />

      <Payment cart={cart} availablePaymentMethods={paymentMethods} />

      <Review cart={cart} />
    </div>
  )
}
