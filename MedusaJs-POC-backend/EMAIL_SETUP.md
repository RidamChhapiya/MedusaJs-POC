# Email (Notification) Setup

This project uses **Medusa’s Notification Module** with a **Gmail (Nodemailer)** provider so you can send emails **for free** from your personal Gmail (e.g. `manavpandya7603@gmail.com`) – no domain verification, no paid service.

## How it works

1. **Notification Module** – Medusa’s built-in notification system; it delegates to a **provider**.
2. **Gmail provider** (`src/modules/notification-gmail`) – Sends email via your Gmail using Nodemailer. When `GMAIL_USER` and `GMAIL_APP_PASSWORD` are set, real emails are sent. When not set, it only logs “would send”.
3. **Subscriber** – On `order.placed` (checkout, recharge, SIM purchase), an order confirmation email is sent to the order’s email address.

## Free setup with your Gmail

1. **Use a Gmail account** (e.g. `manavpandya7603@gmail.com`).

2. **Turn on 2-Step Verification**  
   [Google Account → Security → 2-Step Verification](https://myaccount.google.com/security)

3. **Create an App Password**  
   - Go to [App passwords](https://myaccount.google.com/apppasswords) (only visible after 2-Step Verification is on).  
   - App: **Mail**, Device: **Other** (e.g. “Medusa”), then **Generate**.  
   - Copy the **16-character** password (no spaces).

4. **Add to backend `.env`**:
   ```bash
   GMAIL_USER=manavpandya7603@gmail.com
   GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
   ```
   Use the 16-character App Password (you can paste with or without spaces).

5. **Restart the backend.**

Emails will be sent **from** your Gmail to any recipient. Gmail free limit is about **500 emails/day** (enough for testing and low traffic).

## If you don’t set Gmail

If `GMAIL_USER` or `GMAIL_APP_PASSWORD` is missing, the provider only **logs** that it would send – no real email, no signup required.

## What gets sent

- **Order confirmation** – When an order is placed (store checkout, recharge, SIM purchase), one email per order to the order’s email, with subject “Order confirmation” and a short order summary.

## Files

| What | Where |
|------|--------|
| Gmail provider | `src/modules/notification-gmail/` |
| Notification config | `medusa-config.ts` → notification module + Gmail provider |
| Order confirmation workflow | `src/workflows/send-order-confirmation.ts` |
| Order-placed email subscriber | `src/subscribers/order-placed-email.ts` |

## Optional: Resend instead of Gmail

The Resend provider is still in `src/modules/resend/`. To use Resend (e.g. with a custom domain), add it as a provider in `medusa-config.ts` and set `RESEND_API_KEY` and `RESEND_FROM_EMAIL`. See [Medusa Resend guide](https://docs.medusajs.com/resources/integrations/guides/resend).
