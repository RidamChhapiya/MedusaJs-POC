"use client"

import { useState } from "react"
import { Badge } from "@medusajs/ui"
import { useCustomerSubscriptions, useCustomerDashboard } from "@lib/hooks/use-telecom"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"
import Spinner from "@modules/common/icons/spinner"
import { convertToLocale } from "@lib/util/money"

type MyNumbersProps = {
  customer: HttpTypes.StoreCustomer | null
  /** Region currency code (e.g. inr, usd). Used for all amount formatting. */
  currencyCode?: string
}

function formatDataMB(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`
  return `${mb} MB`
}

function formatVoice(min: number, isUnlimited?: boolean): string {
  if (isUnlimited || min >= 999999) return "Unlimited"
  return `${min} min`
}

/** Format amount from backend (paise/cents) to display currency */
function formatAmount(paise: number, currencyCode: string = "inr"): string {
  const code = (currencyCode || "inr").toUpperCase()
  return convertToLocale({ amount: paise / 100, currency_code: code })
}

function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number)
  const d = new Date(y, m - 1, 1)
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" })
}

export default function MyNumbers({ customer, currencyCode = "inr" }: MyNumbersProps) {
  const { data: subscriptions, isLoading, error } = useCustomerSubscriptions(customer?.id)
  const { data: dashboard, isLoading: dashboardLoading } = useCustomerDashboard(customer?.id)
  const [expandedId, setExpandedId] = useState<string | null>(null)

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

  const totalDataLeftMb =
    dashboard?.data_left_mb ??
    subscriptions?.reduce((s, sub) => s + (sub.data_balance_mb ?? 0), 0) ??
    0
  const totalDataLeftGb = (totalDataLeftMb / 1024).toFixed(1)
  const thisMonthSpent = dashboard?.spending_this_month ?? 0
  const lastMonthSpent = dashboard?.spending_last_month ?? 0
  const spendingByMonth = dashboard?.spending_by_month ?? []

  return (
    <div className="w-full" data-testid="my-numbers-page-wrapper">
      {/* Analytics: clear summary */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-ui-fg-base mb-4">Summary</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-ui-border-base bg-ui-bg-subtle p-5">
            <div className="text-sm font-medium text-ui-fg-muted mb-1">Data left (all numbers)</div>
            <div className="text-2xl font-bold text-ui-fg-base" data-testid="analytics-data-left">
              {totalDataLeftGb} GB
            </div>
          </div>
          <div className="rounded-xl border border-ui-border-base bg-ui-bg-subtle p-5">
            <div className="text-sm font-medium text-ui-fg-muted mb-1">This month spent</div>
            <div className="text-2xl font-bold text-ui-fg-base" data-testid="analytics-this-month-spent">
              {dashboardLoading ? "—" : formatAmount(thisMonthSpent, currencyCode)}
            </div>
            <div className="text-xs text-ui-fg-muted mt-0.5">Recharges & renewals</div>
          </div>
          <div className="rounded-xl border border-ui-border-base bg-ui-bg-subtle p-5">
            <div className="text-sm font-medium text-ui-fg-muted mb-1">Last month spent</div>
            <div className="text-2xl font-bold text-ui-fg-base" data-testid="analytics-last-month-spent">
              {dashboardLoading ? "—" : formatAmount(lastMonthSpent, currencyCode)}
            </div>
          </div>
          <div className="rounded-xl border border-ui-border-base bg-ui-bg-subtle p-5">
            <div className="text-sm font-medium text-ui-fg-muted mb-3">Monthly spending</div>
            <div className="space-y-2 min-h-[2.5rem]">
              {spendingByMonth.length === 0 ? (
                <span className="text-sm text-ui-fg-muted">No history yet</span>
              ) : (
                spendingByMonth.slice(0, 5).map((m) => (
                  <div key={m.month} className="flex justify-between items-baseline gap-2">
                    <span className="text-sm text-ui-fg-muted shrink-0">
                      {formatMonthLabel(m.month)}
                    </span>
                    <span className="text-sm font-semibold text-ui-fg-base tabular-nums">
                      {formatAmount(m.amount, currencyCode)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Your numbers: click to expand one at a time */}
      <section>
        <h2 className="text-lg font-semibold text-ui-fg-base mb-4">Your numbers</h2>
        <div className="space-y-3">
          {subscriptions.map((sub) => {
            const isExpanded = expandedId === sub.id
            const dataQuotaMb = sub.data_quota_mb ?? 0
            const dataBalanceMb = sub.data_balance_mb ?? 0
            const voiceQuotaMin = sub.voice_quota_min ?? 0
            const voiceBalanceMin = sub.voice_balance_min ?? 0
            const isVoiceUnlimited = voiceQuotaMin >= 999999
            const dataPercent =
              dataQuotaMb > 0 ? Math.min(100, Math.round((dataBalanceMb / dataQuotaMb) * 100)) : 0

            return (
              <div
                key={sub.id}
                className="rounded-xl border border-ui-border-base bg-ui-bg-base overflow-hidden"
                data-testid="my-numbers-card"
                data-value={sub.msisdn}
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : sub.id)}
                  className="w-full flex items-center justify-between gap-4 p-4 text-left hover:bg-ui-bg-subtle transition-colors"
                  aria-expanded={isExpanded}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-lg font-semibold text-ui-fg-base truncate" data-testid="number-msisdn">
                      {sub.msisdn ?? "—"}
                    </span>
                    <Badge
                      color={
                        sub.status === "active" ? "green" : sub.status === "suspended" ? "orange" : "grey"
                      }
                    >
                      {sub.status}
                    </Badge>
                    <span className="text-sm text-ui-fg-muted truncate hidden sm:inline">
                      {sub.plan?.name ?? "Unknown plan"}
                    </span>
                  </div>
                  <span
                    className={`shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-ui-bg-component transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    aria-hidden
                  >
                    <svg className="w-4 h-4 text-ui-fg-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </button>

                {isExpanded && (
                  <div className="border-t border-ui-border-base bg-ui-bg-subtle/50 px-4 py-5 space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <div className="text-sm font-medium text-ui-fg-muted mb-1">Data (as per plan)</div>
                        <div className="flex items-baseline gap-2">
                          <span className="font-semibold text-ui-fg-base">
                            {formatDataMB(dataBalanceMb)}
                          </span>
                          <span className="text-sm text-ui-fg-muted">
                            left of {formatDataMB(dataQuotaMb)}
                          </span>
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
                        <div className="text-sm font-medium text-ui-fg-muted mb-1">Voice / Calls</div>
                        <div className="flex items-baseline gap-2">
                          <span className="font-semibold text-ui-fg-base">
                            {formatVoice(voiceBalanceMin, isVoiceUnlimited)}
                          </span>
                          {!isVoiceUnlimited && (
                            <span className="text-sm text-ui-fg-muted">
                              left of {formatVoice(voiceQuotaMin, true)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      {sub.end_date && (
                        <span className="text-sm text-ui-fg-muted">
                          Valid until {new Date(sub.end_date).toLocaleDateString()}
                        </span>
                      )}
                      {sub.validity_days != null && sub.validity_days > 0 && (
                        <span className="text-sm text-ui-fg-muted">
                          Plan validity: {sub.validity_days} days
                        </span>
                      )}
                      {sub.auto_renew && (
                        <span className="text-sm text-ui-fg-muted">Auto-renew on</span>
                      )}
                      <LocalizedClientLink
                        href={
                          sub.msisdn
                            ? `/recharge?number=${encodeURIComponent(sub.msisdn)}`
                            : "/recharge"
                        }
                        className="ml-auto inline-flex items-center justify-center rounded-lg border border-ui-border-base bg-ui-bg-base px-4 py-2 text-sm font-medium text-ui-fg-base hover:bg-ui-bg-base-hover"
                      >
                        Recharge this number →
                      </LocalizedClientLink>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
