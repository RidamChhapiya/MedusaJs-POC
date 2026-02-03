import { retrieveCart } from "@lib/data/cart"
import { HttpTypes } from "@medusajs/types"
import CartDropdown from "../cart-dropdown"

type CartButtonProps = {
  /** When provided (e.g. from layout), skips fetching cart again */
  cart?: HttpTypes.StoreCart | null
}

export default async function CartButton({ cart: cartProp }: CartButtonProps) {
  const cart =
    cartProp !== undefined
      ? cartProp
      : await retrieveCart().catch(() => null)

  return <CartDropdown cart={cart} />
}
