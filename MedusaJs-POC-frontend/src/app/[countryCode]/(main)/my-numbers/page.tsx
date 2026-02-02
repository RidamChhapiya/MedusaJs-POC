import { Metadata } from "next"
import { redirect } from "next/navigation"
import { retrieveCustomer } from "@lib/data/customer"
import { getRegion } from "@lib/data/regions"
import MyNumbersContent from "@modules/account/components/my-numbers"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export const metadata: Metadata = {
  title: "My numbers",
  description: "Your numbers, recharges, and usage.",
}

type MyNumbersPageProps = {
  params: Promise<{ countryCode: string }>
}

export default async function MyNumbersPage({ params }: MyNumbersPageProps) {
  const { countryCode } = await params
  const [customer, region] = await Promise.all([
    retrieveCustomer().catch(() => null),
    getRegion(countryCode),
  ])

  if (!customer) {
    redirect(`/${countryCode}/account`)
  }

  const currencyCode = region?.currency_code ?? "inr"

  return (
    <div className="content-container py-8 small:py-12">
      {/* Hero */}
      <div className="mb-10 small:mb-12">
        <h1 className="text-3xl small:text-4xl font-bold text-ui-fg-base mb-2">
          My numbers
        </h1>
        <p className="text-base small:text-lg text-ui-fg-subtle max-w-2xl mb-6">
          All your numbers, recharges, data balance, and spending. Recharge or buy a new SIM anytime.
        </p>
        <div className="flex flex-wrap gap-3">
          <LocalizedClientLink href="/recharge">
            <span className="inline-flex items-center justify-center rounded-md border border-ui-border-base bg-ui-bg-base px-4 py-2 text-sm font-medium text-ui-fg-base shadow-sm hover:bg-ui-bg-base-hover">
              Instant Recharge
            </span>
          </LocalizedClientLink>
          <LocalizedClientLink href="/buy-sim">
            <span className="inline-flex items-center justify-center rounded-md border border-ui-border-base bg-ui-bg-base px-4 py-2 text-sm font-medium text-ui-fg-base shadow-sm hover:bg-ui-bg-base-hover">
              Buy a SIM
            </span>
          </LocalizedClientLink>
          <LocalizedClientLink href="/account">
            <span className="inline-flex items-center justify-center rounded-md border border-ui-border-base bg-ui-bg-subtle px-4 py-2 text-sm font-medium text-ui-fg-subtle hover:bg-ui-bg-base-hover">
              My Hub &amp; Orders
            </span>
          </LocalizedClientLink>
        </div>
      </div>

      {/* Numbers, recharges, analytics */}
      <MyNumbersContent customer={customer} currencyCode={currencyCode} />
    </div>
  )
}
