import { Suspense } from "react"

import { listRegions } from "@lib/data/regions"
import { listLocales } from "@lib/data/locales"
import { getLocale } from "@lib/data/locale-actions"
import { StoreCart, StoreRegion } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CartButton from "@modules/layout/components/cart-button"
import ClientNav from "./client-nav"

type NavProps = {
  /** Cart from layout; when provided, CartButton skips fetching again */
  cart?: StoreCart | null
}

export default async function Nav({ cart }: NavProps) {
  const [regions, locales, currentLocale] = await Promise.all([
    listRegions().then((regions: StoreRegion[]) => regions),
    listLocales(),
    getLocale(),
  ])

  return (
    <ClientNav
      regions={regions}
      locales={locales}
      currentLocale={currentLocale}
      cartButton={
        <Suspense
          fallback={
            <LocalizedClientLink
              className="relative px-4 py-2 rounded-full transition-all duration-300 ease-out text-grey-70 dark:text-grey-40 font-medium hover:text-ui-fg-base dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 hover:shadow-[0_0_15px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:scale-105 whitespace-nowrap flex items-center gap-2"
              href="/cart"
              data-testid="nav-cart-link"
            >
              Cart (0)
            </LocalizedClientLink>
          }
        >
          <CartButton cart={cart} />
        </Suspense>
      }
    />
  )
}

