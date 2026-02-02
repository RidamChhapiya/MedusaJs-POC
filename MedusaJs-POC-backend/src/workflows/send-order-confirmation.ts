import {
  createWorkflow,
  when,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { useQueryGraphStep, sendNotificationsStep } from "@medusajs/core-flows"

type WorkflowInput = { id: string }

/**
 * Send order confirmation email when an order is placed.
 * Uses the Notification Module (Resend provider when RESEND_API_KEY is set).
 */
export const sendOrderConfirmationWorkflow = createWorkflow(
  "send-order-confirmation",
  (input: WorkflowInput) => {
    const { data: orders } = useQueryGraphStep({
      entity: "order",
      fields: [
        "id",
        "display_id",
        "email",
        "currency_code",
        "total",
        "items.*",
        "shipping_address.*",
        "shipping_methods.*",
        "customer.*",
      ],
      filters: { id: input.id },
      options: { isList: true },
    })

    const notification = when(
      { orders },
      (data) => !!data.orders?.[0]?.email
    ).then(() =>
      sendNotificationsStep([
        {
          to: (orders as { email?: string }[])[0].email!,
          channel: "email",
          template: "order-placed",
          trigger_type: "order.placed",
          resource_id: (orders as { id: string }[])[0].id,
          resource_type: "order",
          data: { order: (orders as unknown[])[0] },
        },
      ])
    )

    return new WorkflowResponse({ notification })
  }
)
