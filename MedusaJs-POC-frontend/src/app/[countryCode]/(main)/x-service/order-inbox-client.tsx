"use client"

import { useEffect, useState } from "react"

type OrderEntry = {
  received_at: string
  payload: {
    event?: string
    order_id?: string
    display_id?: number | null
    email?: string | null
    created_at?: string
    items?: Array<{
      id: string
      title: string
      quantity: number
      variant_title?: string | null
    }>
    shipping_address?: Record<string, unknown> | null
  }
}

export default function OrderInboxClient() {
  const [orders, setOrders] = useState<OrderEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOrders = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/order-webhook")
      if (!res.ok) throw new Error("Failed to load")
      const data = await res.json()
      setOrders(data.orders ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  if (loading) {
    return (
      <div className="content-container py-8">
        <p className="text-ui-fg-subtle">Loading orders…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="content-container py-8">
        <p className="text-ui-fg-error">{error}</p>
        <button
          type="button"
          onClick={fetchOrders}
          className="mt-2 rounded border border-ui-border-base px-3 py-1.5 text-sm"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="content-container py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">X Service – Order webhook inbox</h1>
        <button
          type="button"
          onClick={fetchOrders}
          className="rounded border border-ui-border-base bg-ui-bg-subtle px-3 py-1.5 text-sm hover:bg-ui-bg-base"
        >
          Refresh
        </button>
      </div>
      <p className="mb-4 text-sm text-ui-fg-muted">
        Orders received here when the backend POSTs to <code className="rounded bg-ui-bg-subtle px-1">/api/order-webhook</code> (e.g. after Place order, recharge, SIMs, accessories). In-memory only; resets on server restart.
      </p>
      {orders.length === 0 ? (
        <p className="text-ui-fg-subtle">No orders received yet.</p>
      ) : (
        <ul className="space-y-4">
          {orders.map((entry, i) => (
            <li
              key={`${entry.received_at}-${entry.payload.order_id ?? i}`}
              className="rounded-lg border border-ui-border-base bg-ui-bg-subtle p-4"
            >
              <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium text-ui-fg-base">
                  Order {entry.payload.display_id ?? entry.payload.order_id ?? "—"}
                </span>
                <span className="text-ui-fg-muted">received {new Date(entry.received_at).toLocaleString()}</span>
              </div>
              {entry.payload.email && (
                <p className="text-sm text-ui-fg-subtle">Email: {entry.payload.email}</p>
              )}
              {entry.payload.items?.length ? (
                <div className="mt-2">
                  <p className="text-xs font-medium text-ui-fg-muted">Items</p>
                  <ul className="mt-1 list-inside list-disc text-sm">
                    {entry.payload.items.map((item) => (
                      <li key={item.id}>
                        {item.title} × {item.quantity}
                        {item.variant_title ? ` (${item.variant_title})` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {entry.payload.shipping_address && typeof entry.payload.shipping_address === "object" && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-ui-fg-muted">Ship to</p>
                  <pre className="mt-1 overflow-auto rounded bg-ui-bg-base p-2 text-xs text-ui-fg-subtle">
                    {JSON.stringify(entry.payload.shipping_address, null, 2)}
                  </pre>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
