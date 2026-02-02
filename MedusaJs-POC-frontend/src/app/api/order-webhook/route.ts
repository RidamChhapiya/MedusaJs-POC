import { NextRequest, NextResponse } from "next/server"

/** In-memory store for received order webhooks (testing / X service). Resets on server restart. */
const MAX_ORDERS = 100
const orderInbox: Array<{
  received_at: string
  payload: Record<string, unknown>
}> = []

export type OrderWebhookPayload = {
  event?: string
  order_id?: string
  display_id?: number | null
  email?: string | null
  created_at?: string
  items?: Array<{ id: string; title: string; quantity: number; variant_title?: string | null }>
  shipping_address?: Record<string, unknown> | null
}

/**
 * POST: Receive order.placed webhook from backend (X service).
 * GET: Return recent orders for the X service inbox page.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as OrderWebhookPayload
    const received_at = new Date().toISOString()
    orderInbox.unshift({ received_at, payload: body })
    if (orderInbox.length > MAX_ORDERS) orderInbox.pop()
    return NextResponse.json({ ok: true, received_at })
  } catch (e) {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 })
  }
}

export async function GET() {
  return NextResponse.json({ orders: orderInbox })
}
