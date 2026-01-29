"use client"

import { Container, Badge } from "@medusajs/ui"
import { useCustomerSubscriptions, useCustomerDashboard } from "@lib/hooks/use-telecom"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"
import Spinner from "@modules/common/icons/spinner"
import { convertToLocale } from "@lib/util/money"

type MyNumbersProps = {
  customer: HttpTypes.StoreCustomer | null
}

function formatDataMB(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`
  return `${mb} MB`
}

function formatVoice(min: number, isUnlimited?: boolean): string {
  if (isUnlimited || (min >= 999999)) return "Unlimited"
  return `${min} min`
}

/** Format amount from backend (paise/cents) to display */
function formatAmount(paise: number, currencyCode: string = "inr"): string {
  return convertToLocale({ amount: paise / 100, currency_code: currencyCode.toUpperCase() })
}

function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number)
  const d = new Date(y, m - 1, 1)
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" })
}

export default function MyNumbers({ customer }: MyNumbersProps) {
  const { data: subscriptions, isLoading, error } = useCustomerSubscriptions(customer?.id)
  const { data: dashboard, isLoading: dashboardLoading } = useCustomerDashboard(customer?.id)

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12" data-testid="my-numbers-loading">
        <Spinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-ui-fg-error py-6" data-testid="my-numbers-error">
        Failed to load your numbers. Please try again.
      </div>
    )
  }

  if (!subscriptions || subscriptions.length === 0) {
    return (
      <div className="py-8" data-testid="my-numbers-empty">
        <p className="text-base-regular text-ui-fg-subtle mb-4">
          You haven&apos;t bought any SIMs yet. Purchase a number to get started.
        </p>
        <LocalizedClientLink href="/buy-sim">
          <span className="text-ui-fg-interactive hover:underline font-medium">Buy a SIM →</span>
        </LocalizedClientLink>
      </div>
    )
  }

  const totalDataLeftMb = dashboard?.data_left_mb ?? (subscriptions?.reduce((s, sub) => s + (sub.data_balance_mb ?? 0), 0) ?? 0)
  const totalDataLeftGb = (totalDataLeftMb / 1024).toFixed(1)
  const thisMonthSpent = dashboard?.spending_this_month ?? 0
  const lastMonthSpent = dashboard?.spending_last_month ?? 0
  const spendingByMonth = dashboard?.spending_by_month ?? []

  return (
    <div className="w-full" data-testid="my-numbers-page-wrapper">
      {/* Analytics section */}
      <div className="mb-8 grid grid-cols-1 small:grid-cols-2 lg:grid-cols-4 gap-4">
        <Container className="p-4 bg-ui-bg-base border border-ui-border-base rounded-lg">
          <div className="text-sm text-ui-fg-subtle mb-1">Data left (current cycle)</div>
          <div className="text-xl font-semibold" data-testid="analytics-data-left">
            {totalDataLeftGb} GB
          </div>
          <div className="text-xs text-ui-fg-muted mt-1">Across all your numbers</div>
        </Container>
        <Container className="p-4 bg-ui-bg-base border border-ui-border-base rounded-lg">
          <div className="text-sm text-ui-fg-subtle mb-1">This month spent</div>
          <div className="text-xl font-semibold" data-testid="analytics-this-month-spent">
            {dashboardLoading ? "—" : formatAmount(thisMonthSpent)}
          </div>
          <div className="text-xs text-ui-fg-muted mt-1">Recharges &amp; renewals</div>
        </Container>
        <Container className="p-4 bg-ui-bg-base border border-ui-border-base rounded-lg">
          <div className="text-sm text-ui-fg-subtle mb-1">Last month spent</div>
          <div className="text-xl font-semibold" data-testid="analytics-last-month-spent">
            {dashboardLoading ? "—" : formatAmount(lastMonthSpent)}
          </div>
          <div className="text-xs text-ui-fg-muted mt-1">Previous month</div>
        </Container>
        <Container className="p-4 bg-ui-bg-base border border-ui-border-base rounded-lg">
          <div className="text-sm text-ui-fg-subtle mb-1">Monthly spending</div>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {spendingByMonth.length === 0 ? (
              <span className="text-xs text-ui-fg-muted">No history yet</span>
            ) : (
              spendingByMonth.slice(0, 5).map((m) => (
                <div key={m.month} className="flex justify-between text-xs">
                  <span className="text-ui-fg-muted">{formatMonthLabel(m.month)}</span>
                  <span className="font-medium">{formatAmount(m.amount)}</span>
                </div>
              ))
            )}
          </div>
        </Container>
      </div>

      <h2 className="text-xl font-semibold text-ui-fg-base mb-4 mt-2">Your numbers</h2>
      <div className="grid grid-cols-1 gap-6">
        {subscriptions.map((sub) => {
          const dataQuotaMb = sub.data_quota_mb ?? 0
          const dataBalanceMb = sub.data_balance_mb ?? 0
          const voiceQuotaMin = sub.voice_quota_min ?? 0
          const voiceBalanceMin = sub.voice_balance_min ?? 0
          const isVoiceUnlimited = voiceQuotaMin >= 999999
          const dataPercent = dataQuotaMb > 0 ? Math.min(100, Math.round((dataBalanceMb / dataQuotaMb) * 100)) : 0

          return (
            <Container
              key={sub.id}
              className="p-6 bg-ui-bg-base border border-ui-border-base rounded-lg"
              data-testid="my-numbers-card"
              data-value={sub.msisdn}
            >
              <div className="flex flex-col small:flex-row small:items-center small:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xl font-semibold" data-testid="number-msisdn">
                      {sub.msisdn ?? "—"}
                    </span>
                    <Badge color={sub.status === "active" ? "green" : sub.status === "suspended" ? "orange" : "grey"}>
                      {sub.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-ui-fg-subtle mt-1">{sub.plan?.name ?? "Unknown plan"}</p>
                  <p className="text-xs text-ui-fg-muted mt-1">
                    Valid until {sub.end_date ? new Date(sub.end_date).toLocaleDateString() : "—"}
                  </p>
                </div>
                <div className="small:text-right">
                  <LocalizedClientLink href={sub.msisdn ? `/recharge?number=${encodeURIComponent(sub.msisdn)}` : "/recharge"}>
                    <span className="text-ui-fg-interactive hover:underline text-sm font-medium">Recharge this number →</span>
                  </LocalizedClientLink>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 small:grid-cols-2 gap-6 border-t border-ui-border-base pt-6">
                <div>
                  <div className="text-sm text-ui-fg-subtle mb-1">Data (as per plan)</div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold">{formatDataMB(dataBalanceMb)}</span>
                    <span className="text-ui-fg-muted text-sm">left of {formatDataMB(dataQuotaMb)}</span>
                  </div>
                  {dataQuotaMb > 0 && (
                    <div className="mt-2 w-full bg-ui-bg-component rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-ui-fg-interactive rounded-full transition-all"
                        style={{ width: `${dataPercent}%` }}
                      />
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-sm text-ui-fg-subtle mb-1">Voice / Calls (as per plan)</div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold">
                      {formatVoice(voiceBalanceMin, isVoiceUnlimited)}
                    </span>
                    <span className="text-ui-fg-muted text-sm">
                      {isVoiceUnlimited ? "" : `left of ${formatVoice(voiceQuotaMin, true)}`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-ui-border-base flex flex-wrap gap-2">
                {sub.validity_days != null && sub.validity_days > 0 && (
                  <span className="text-xs text-ui-fg-muted">Plan validity: {sub.validity_days} days</span>
                )}
                {sub.auto_renew && (
                  <span className="text-xs text-ui-fg-muted">Auto-renew on</span>
                )}
              </div>
            </Container>
          )
        })}
      </div>
    </div>
  )
}
