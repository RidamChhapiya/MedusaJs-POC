"use client"

import { Container, Badge } from "@medusajs/ui"
import { useCustomerDashboard, useCustomerSubscriptions, useCustomerUsage } from "@lib/hooks/use-telecom"

import ChevronDown from "@modules/common/icons/chevron-down"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"

type OverviewProps = {
  customer: HttpTypes.StoreCustomer | null
  orders: HttpTypes.StoreOrder[] | null
}

const Overview = ({ customer, orders }: OverviewProps) => {
  // Fetch Telecom Data
  // We use customer ID if available, otherwise it might skip.
  const { data: dashboard } = useCustomerDashboard(customer?.id)
  const { data: subscriptions } = useCustomerSubscriptions(customer?.id)
  const { data: usage } = useCustomerUsage(customer?.id)
  // Mock data for usage chart visualization if needed, or simple progress bar

  return (
    <div data-testid="overview-page-wrapper">
      <div className="hidden small:block">

        {/* Telecom Dashboard Section */}
        {dashboard && (
          <div className="mb-12 border-b pb-8">
            <h2 className="text-xl font-bold mb-6">My Hub</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Balance Card */}
              <Container className="p-6 bg-ui-bg-base shadow-sm">
                <div className="text-ui-fg-subtle text-sm mb-2">Current Balance</div>
                <div className="text-3xl font-bold mb-2">
                  {convertToLocale({ amount: dashboard.balance, currency_code: dashboard.currency_code })}
                </div>
                <LocalizedClientLink href="/recharge">
                  <Badge color="green" className="cursor-pointer">Top Up Now &rarr;</Badge>
                </LocalizedClientLink>
              </Container>

              {/* Data Usage */}
              <Container className="p-6 bg-ui-bg-base shadow-sm">
                <div className="text-ui-fg-subtle text-sm mb-2">Data Remaining</div>
                <div className="text-3xl font-bold mb-2">{dashboard.data_left} GB</div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                  <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '45%' }}></div>
                </div>
                <div className="text-xs text-right mt-1 text-ui-fg-subtle">45% used</div>
              </Container>

              {/* Voice/SMS */}
              <Container className="p-6 bg-ui-bg-base shadow-sm">
                <div className="text-ui-fg-subtle text-sm mb-2">Voice & SMS</div>
                <div className="flex justify-between items-center mb-1">
                  <span>Voice</span>
                  <span className="font-bold">{dashboard.voice_left} Min</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>SMS</span>
                  <span className="font-bold">{dashboard.sms_left}</span>
                </div>
              </Container>
            </div>

            {/* Active Plans */}
            {subscriptions && subscriptions.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">Active Plan</h3>
                <div className="border rounded-lg p-4 flex justify-between items-center bg-gray-50">
                  <div>
                    <div className="font-bold text-lg">{subscriptions[0].plan.name}</div>
                    <div className="text-sm text-ui-fg-subtle">
                      Expires on {new Date(subscriptions[0].end_date).toLocaleDateString()}
                    </div>
                  </div>
                  <Badge color={subscriptions[0].status === "active" ? "green" : "red"}>
                    {subscriptions[0].status}
                  </Badge>
                </div>
              </div>
            )}
          </div>
        )}


        <div className="text-xl-semi flex justify-between items-center mb-4">
          <span data-testid="welcome-message" data-value={customer?.first_name}>
            Hello {customer?.first_name}
          </span>
          <span className="text-small-regular text-ui-fg-base">
            Signed in as:{" "}
            <span
              className="font-semibold"
              data-testid="customer-email"
              data-value={customer?.email}
            >
              {customer?.email}
            </span>
          </span>
        </div>
        <div className="flex flex-col py-8 border-t border-gray-200">
          <div className="flex flex-col gap-y-4 h-full col-span-1 row-span-2 flex-1">
            <div className="flex items-start gap-x-16 mb-6">
              <div className="flex flex-col gap-y-4">
                <h3 className="text-large-semi">Profile</h3>
                <div className="flex items-end gap-x-2">
                  <span
                    className="text-3xl-semi leading-none"
                    data-testid="customer-profile-completion"
                    data-value={getProfileCompletion(customer)}
                  >
                    {getProfileCompletion(customer)}%
                  </span>
                  <span className="uppercase text-base-regular text-ui-fg-subtle">
                    Completed
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-y-4">
                <h3 className="text-large-semi">Addresses</h3>
                <div className="flex items-end gap-x-2">
                  <span
                    className="text-3xl-semi leading-none"
                    data-testid="addresses-count"
                    data-value={customer?.addresses?.length || 0}
                  >
                    {customer?.addresses?.length || 0}
                  </span>
                  <span className="uppercase text-base-regular text-ui-fg-subtle">
                    Saved
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-y-4">
              <div className="flex items-center gap-x-2">
                <h3 className="text-large-semi">Recent orders</h3>
              </div>
              <ul
                className="flex flex-col gap-y-4"
                data-testid="orders-wrapper"
              >
                {orders && orders.length > 0 ? (
                  orders.slice(0, 5).map((order) => {
                    return (
                      <li
                        key={order.id}
                        data-testid="order-wrapper"
                        data-value={order.id}
                      >
                        <LocalizedClientLink
                          href={`/account/orders/details/${order.id}`}
                        >
                          <Container className="bg-gray-50 flex justify-between items-center p-4">
                            <div className="grid grid-cols-3 grid-rows-2 text-small-regular gap-x-4 flex-1">
                              <span className="font-semibold">Date placed</span>
                              <span className="font-semibold">
                                Order number
                              </span>
                              <span className="font-semibold">
                                Total amount
                              </span>
                              <span data-testid="order-created-date">
                                {new Date(order.created_at).toDateString()}
                              </span>
                              <span
                                data-testid="order-id"
                                data-value={order.display_id}
                              >
                                #{order.display_id}
                              </span>
                              <span data-testid="order-amount">
                                {convertToLocale({
                                  amount: order.total,
                                  currency_code: order.currency_code,
                                })}
                              </span>
                            </div>
                            <button
                              className="flex items-center justify-between"
                              data-testid="open-order-button"
                            >
                              <span className="sr-only">
                                Go to order #{order.display_id}
                              </span>
                              <ChevronDown className="-rotate-90" />
                            </button>
                          </Container>
                        </LocalizedClientLink>
                      </li>
                    )
                  })
                ) : (
                  <span data-testid="no-orders-message">No recent orders</span>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const getProfileCompletion = (customer: HttpTypes.StoreCustomer | null) => {
  let count = 0

  if (!customer) {
    return 0
  }

  if (customer.email) {
    count++
  }

  if (customer.first_name && customer.last_name) {
    count++
  }

  if (customer.phone) {
    count++
  }

  const billingAddress = customer.addresses?.find(
    (addr) => addr.is_default_billing
  )

  if (billingAddress) {
    count++
  }

  return (count / 4) * 100
}

export default Overview
