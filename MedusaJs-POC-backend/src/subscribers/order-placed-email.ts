import type { SubscriberConfig } from "@medusajs/framework"
import { sendOrderConfirmationWorkflow } from "../workflows/send-order-confirmation"

/**
 * Order placed email subscriber
 * Sends an order confirmation email when an order is placed (checkout, recharge, SIM purchase).
 * Uses the Notification Module (Resend when RESEND_API_KEY is set; otherwise logs only).
 */
export default async function orderPlacedEmailHandler({
  event: { data },
  container,
}: {
  event: { data: { id: string } }
  container: any
}) {
  try {
    await sendOrderConfirmationWorkflow(container).run({
      input: { id: data.id },
    })
  } catch (err) {
    console.error("[OrderPlacedEmail] Failed to send order confirmation:", err)
    // Do not rethrow – order placement must succeed; email is best-effort
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
  context: {
    subscriberId: "order-placed-email",
  },
}
