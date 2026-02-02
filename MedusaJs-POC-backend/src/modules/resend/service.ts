import {
  AbstractNotificationProviderService,
  MedusaError,
} from "@medusajs/framework/utils"
import type { Logger } from "@medusajs/framework/types"
import type { ProviderSendNotificationDTO } from "@medusajs/framework/types"
import { Resend } from "resend"

export type ResendOptions = {
  api_key?: string
  from: string
  html_templates?: Record<
    string,
    { subject?: string; content: string }
  >
}

type InjectedDependencies = {
  logger: Logger
}

const TEMPLATE_ORDER_PLACED = "order-placed"

/**
 * Resend Notification Provider
 * Sends emails via Resend. If api_key is not set, logs only (dev / free testing).
 */
class ResendNotificationProviderService extends AbstractNotificationProviderService {
  static identifier = "notification-resend"

  private resendClient: Resend | null = null
  private options: ResendOptions
  private logger: Logger

  constructor(
    { logger }: InjectedDependencies,
    options: ResendOptions
  ) {
    super()
    this.options = options
    this.logger = logger
    if (options.api_key) {
      this.resendClient = new Resend(options.api_key)
    } else {
      this.logger.warn(
        "[Resend] RESEND_API_KEY not set – emails will be logged only, not sent."
      )
    }
  }

  static validateOptions(options: Record<string, unknown>): void {
    if (!options.from) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Option `from` is required in the provider's options."
      )
    }
    // api_key is optional – when missing we log only
  }

  private getOrderPlacedHtml(data: { order?: Record<string, unknown> }): string {
    const order = data?.order as Record<string, unknown> | undefined
    const displayId = order?.display_id ?? order?.id ?? "—"
    const email = (order?.email as string) ?? ""
    const total = order?.total != null ? String(order.total) : "—"
    const items = (order?.items as Array<{ title?: string; quantity?: number }>) ?? []
    const itemsList = items
      .map((i) => `<li>${i.title ?? "Item"} × ${i.quantity ?? 1}</li>`)
      .join("")

    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Order Confirmation</title></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
  <h2>Thank you for your order</h2>
  <p>Order #${displayId}</p>
  <p>We're processing your order and will notify you when it ships.</p>
  <h3>Order summary</h3>
  <ul>${itemsList || "<li>—</li>"}</ul>
  <p><strong>Total:</strong> ${total}</p>
  <p style="color:#666;font-size:12px;">If you have questions, reply to this email. Order ID: ${order?.id ?? ""}</p>
</body>
</html>
`.trim()
  }

  private getTemplateContent(template: string, data: Record<string, unknown>): string | null {
    if (this.options.html_templates?.[template]?.content) {
      return this.options.html_templates[template].content
    }
    if (template === TEMPLATE_ORDER_PLACED) {
      return this.getOrderPlacedHtml(data)
    }
    return null
  }

  private getTemplateSubject(template: string): string {
    if (this.options.html_templates?.[template]?.subject) {
      return this.options.html_templates[template].subject
    }
    if (template === TEMPLATE_ORDER_PLACED) return "Order confirmation"
    return "Notification"
  }

  async send(notification: ProviderSendNotificationDTO): Promise<Record<string, unknown>> {
    if (!notification?.to) {
      this.logger.error("[Resend] No recipient (to) provided")
      return {}
    }

    const content = this.getTemplateContent(
      notification.template as string,
      (notification.data as Record<string, unknown>) ?? {}
    )

    if (!content) {
      this.logger.warn(
        `[Resend] No template for '${notification.template}' – skipping send`
      )
      return {}
    }

    const subject = this.getTemplateSubject(notification.template as string)

    if (!this.resendClient) {
      this.logger.info(
        `[Resend] Would send email to ${notification.to} subject "${subject}" (api_key not set)`
      )
      return {}
    }

    try {
      const { data, error } = await this.resendClient.emails.send({
        from: this.options.from,
        to: notification.to as string,
        subject,
        html: content,
      })

      if (error) {
        this.logger.error("[Resend] Failed to send email", error)
        return {}
      }
      return { id: data?.id ?? "" }
    } catch (err) {
      this.logger.error("[Resend] Failed to send email", err)
      return {}
    }
  }
}

export default ResendNotificationProviderService
