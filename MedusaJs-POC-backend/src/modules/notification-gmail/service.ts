import {
  AbstractNotificationProviderService,
  MedusaError,
} from "@medusajs/framework/utils"
import type { Logger } from "@medusajs/framework/types"
import type { ProviderSendNotificationDTO } from "@medusajs/framework/types"
import nodemailer from "nodemailer"
import type { Transporter } from "nodemailer"

export type GmailNotificationOptions = {
  /** Gmail address (e.g. manavpandya7603@gmail.com) */
  user: string
  /** Gmail App Password (16-char) – create at myaccount.google.com/apppasswords */
  pass: string
  html_templates?: Record<string, { subject?: string; content: string }>
}

type InjectedDependencies = {
  logger: Logger
}

const TEMPLATE_ORDER_PLACED = "order-placed"

/**
 * Gmail (Nodemailer) Notification Provider
 * Sends emails via your Gmail for free – no domain verification, send from your personal Gmail.
 * Use Gmail App Password (not your normal password): myaccount.google.com/apppasswords
 */
class GmailNotificationProviderService extends AbstractNotificationProviderService {
  static identifier = "notification-gmail"

  private transporter: Transporter | null = null
  private options: GmailNotificationOptions
  private logger: Logger

  constructor(
    { logger }: InjectedDependencies,
    options: GmailNotificationOptions
  ) {
    super()
    this.options = options
    this.logger = logger
    if (options.user && options.pass) {
      this.transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: options.user,
          pass: options.pass,
        },
      })
    } else {
      this.logger.warn(
        "[Gmail] GMAIL_USER or GMAIL_APP_PASSWORD not set – emails will be logged only."
      )
    }
  }

  static validateOptions(_options: Record<string, unknown>): void {
    // user and pass optional – when missing we log only (dev)
  }

  private getOrderPlacedHtml(data: { order?: Record<string, unknown> }): string {
    const order = data?.order as Record<string, unknown> | undefined
    const metadata = (order?.metadata as Record<string, unknown>) ?? {}
    const orderType = metadata.order_type as string | undefined
    const displayId = order?.display_id ?? order?.id ?? "—"
    const total = order?.total != null ? String(order.total) : "—"
    const items = (order?.items as Array<{ title?: string; quantity?: number; variant_title?: string }>) ?? []
    const itemsRows = items
      .map(
        (i) =>
          `<tr><td style="padding:10px 12px;border-bottom:1px solid #eee;">${i.title ?? "Item"}${i.variant_title ? ` <span style="color:#666;">(${i.variant_title})</span>` : ""}</td><td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:center;">${i.quantity ?? 1}</td></tr>`
      )
      .join("")

    const isSim = orderType === "sim_purchase"
    const isRecharge = orderType === "recharge"
    let extraNote = "We're processing your order and will notify you when it ships."
    if (isSim) extraNote = "Your SIM will be activated shortly. You'll receive a follow-up once your number is ready."
    if (isRecharge) extraNote = "Your recharge has been applied. Your balance will be updated shortly."

    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Order Confirmation</title></head>
<body style="margin:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#f5f5f5;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%);padding:24px 28px;text-align:center;">
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:600;">Order confirmed</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:14px;">Thanks for your order</p>
    </div>
    <div style="padding:28px;">
      <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.5;">Hi there,</p>
      <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.5;">We've received your order and it's being processed.</p>
      <div style="background:#f8fafc;border-radius:8px;padding:16px 20px;margin-bottom:24px;border:1px solid #e2e8f0;">
        <p style="margin:0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Order number</p>
        <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#1e293b;">#${displayId}</p>
      </div>
      <p style="margin:0 0 16px;font-size:14px;color:#64748b;">${extraNote}</p>
      <table style="width:100%;border-collapse:collapse;margin:24px 0;font-size:14px;">
        <thead><tr style="background:#f1f5f9;"><th style="padding:10px 12px;text-align:left;color:#475569;">Item</th><th style="padding:10px 12px;text-align:center;color:#475569;">Qty</th></tr></thead>
        <tbody>${itemsRows || "<tr><td colspan='2' style='padding:12px;color:#64748b;'>—</td></tr>"}</tbody>
      </table>
      <div style="border-top:2px solid #e2e8f0;padding-top:16px;margin-top:20px;">
        <p style="margin:0;font-size:18px;font-weight:700;color:#1e293b;">Total: ${total}</p>
      </div>
    </div>
    <div style="background:#f8fafc;padding:20px 28px;border-top:1px solid #e2e8f0;">
      <p style="margin:0;font-size:12px;color:#64748b;">Questions? Just reply to this email. We're here to help.</p>
      <p style="margin:8px 0 0;font-size:11px;color:#94a3b8;">Order ID: ${order?.id ?? ""}</p>
    </div>
  </div>
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
      this.logger.error("[Gmail] No recipient (to) provided")
      return {}
    }

    const content = this.getTemplateContent(
      notification.template as string,
      (notification.data as Record<string, unknown>) ?? {}
    )

    if (!content) {
      this.logger.warn(
        `[Gmail] No template for '${notification.template}' – skipping send`
      )
      return {}
    }

    const subject = this.getTemplateSubject(notification.template as string)

    if (!this.transporter) {
      this.logger.info(
        `[Gmail] Would send email to ${notification.to} subject "${subject}" (not configured)`
      )
      return {}
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.options.user,
        to: notification.to as string,
        subject,
        html: content,
      })
      return { id: info.messageId ?? "" }
    } catch (err) {
      this.logger.error("[Gmail] Failed to send email", err)
      return {}
    }
  }
}

export default GmailNotificationProviderService
