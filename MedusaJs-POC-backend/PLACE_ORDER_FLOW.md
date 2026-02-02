# What Happens When You Click "Place Order"

## Short answers

- **Does it send an email to the customer?**  
  **No.** In this project, no order confirmation email is sent when an order is placed. Medusa v2 does not send emails by default; you need to add a notification provider (e.g. Resend) and/or a subscriber that sends email on `order.placed`.

- **What happens when you click "Place order"?**  
  The frontend completes the cart via the Store API; the backend runs the **complete cart** workflow (validations, create order, reserve inventory, authorize payment, link order ↔ cart/payment, emit `order.placed`). The user is then redirected to the order confirmation page. Any subscriber listening to `order.placed` (e.g. telecom provisioning) runs after that.

---

## 1. Frontend (storefront)

1. User clicks **"Place order"** in checkout (Review step).
2. **Stripe:** The frontend calls Stripe’s `confirmCardPayment` with the payment session’s `client_secret` and billing details.  
   **Manual:** No Stripe call; it goes straight to step 3.
3. On success, the frontend calls **`placeOrder()`** (from `@lib/data/cart`).
4. **`placeOrder()`** calls the Medusa Store API:
   - **`POST /store/carts/:id/complete`** with the current cart ID (from cookies).
5. If the response is `type: "order"`:
   - Cart cache is revalidated.
   - Order cache is revalidated.
   - Cart ID is removed from cookies.
   - User is **redirected** to **`/{countryCode}/order/{orderId}/confirmed`** (e.g. `/dk/order/order_xxx/confirmed`).
6. The **order confirmation page** loads and fetches the order by ID and renders `OrderCompletedTemplate` (order details, items, totals, etc.).  
   No email is sent from the frontend.

---

## 2. Backend (when `POST /store/carts/:id/complete` is called)

The **complete cart workflow** (`completeCartWorkflow`) runs. In summary it:

1. **Acquires a lock** on the cart (so the same cart cannot be completed twice at the same time).
2. **Checks if the cart is already completed** (order_cart link). If an order already exists for this cart, it returns that order (idempotent).
3. **Validates cart payments** (payment session must exist and be in a valid state).
4. **If this is the first completion** (no order yet):
   - Validates shipping (shipping options still valid).
   - **Creates the order** from cart (items, shipping methods, addresses, `email`, totals, etc.). Order is created with `no_notification: false` (i.e. “notification allowed” – but nothing sends email unless you add it).
   - **Reserves inventory** for the order items.
   - **Registers promotion usage** (if any discounts were used).
   - **Creates links**: order ↔ cart, order ↔ payment collection, order ↔ promotions (if any).
   - **Marks the cart as completed** (`completed_at`).
   - **Emits event:** **`order.placed`** with payload `{ id: orderId }`.
   - **Authorizes the payment session** (Stripe: capture/authorize; manual: marks as authorized).
   - **Adds order payment transactions** (records the payment on the order).
5. **Releases the lock** on the cart.
6. Returns **`{ type: "order", order: <order> }`** to the frontend.

So: **order is created, payment is authorized, inventory is reserved, and `order.placed` is emitted.** No email is sent by the core workflow.

---

## 3. Subscribers (after `order.placed`)

Any subscriber that listens to **`order.placed`** runs after the workflow finishes. In this project:

- **`handle-telecom-order`** (in `src/subscribers/handle-telecom-order.ts`):
  - Listens for **`order.placed`**.
  - Runs **`createSubscriptionWorkflow`** for that order (telecom provisioning: create subscription(s), activate number(s), initialize usage, etc.).
  - Does **not** send email.

There is **no** subscriber in this project that sends an order confirmation email. So **no email is sent to the customer** when they place an order.

---

## 4. How to add order confirmation email

To send an email to the customer when they place an order:

1. **Use the `order.placed` event**  
   When the cart is completed, the backend emits `order.placed` with `{ id: orderId }`. Use this as the trigger.

2. **Options:**
   - **Notification module + provider (e.g. Resend)**  
     Configure Medusa’s Notification Module with an email provider (e.g. Resend). Then either:
     - Use a **subscriber** on `order.placed` that loads the order (and customer email) and calls the notification API to send an “order confirmation” notification, or
     - Rely on a built-in or recipe that already sends order confirmation when notification is configured.
   - **Custom subscriber only**  
     In a subscriber on `order.placed`, load the order, get the customer email (e.g. `order.email` or linked customer), and call your own email API (e.g. Resend, SendGrid) to send a “Order confirmed” email.

3. **Docs**  
   - [Integrate Medusa with Resend (Email Notifications)](https://docs.medusajs.com/resources/integrations/guides/resend)  
   - [Notification Module](https://docs.medusajs.com/resources/infrastructure-modules/notification)

---

## Summary table

| What | Happens in this project? |
|------|---------------------------|
| Cart completed via Store API | Yes |
| Order created in DB | Yes |
| Payment authorized (Stripe or manual) | Yes |
| Inventory reserved | Yes |
| Order ↔ cart / payment / promotions linked | Yes |
| `order.placed` event emitted | Yes |
| Telecom subscriber runs (create subscription, etc.) | Yes (if applicable) |
| **Email sent to customer** | **No** (not implemented) |
| Redirect to order confirmation page | Yes |
| Order visible in Medusa Admin | Yes |
