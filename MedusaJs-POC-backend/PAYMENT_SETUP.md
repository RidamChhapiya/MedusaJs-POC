# Payment Setup (Stripe & Razorpay)

## Stripe (recommended for testing)

Stripe is built into Medusa v2 and is the fastest way to add card payments with a **"Credit card (Test mode)"** label for testing.

### Which Stripe keys to use

Stripe gives you two keys. Use them like this:

| Key | Where to use | Example | Notes |
|-----|----------------|---------|--------|
| **Secret key** | **Backend only** (`.env` as `STRIPE_API_KEY`) | `sk_test_...` | Never expose this. In Stripe Dashboard it may be called “Secret key” or shown when you “Create” or “Reveal” an API key. |
| **Publishable key** | **Frontend** (`.env` as `NEXT_PUBLIC_STRIPE_KEY`) | `pk_test_...` | Safe to expose; used by the browser for Stripe.js / card form. |

- **Backend**: Use the **secret key** (`sk_test_...` for testing). If you “created an API key” in the Dashboard, that is the secret key — put it in the backend.
- **Frontend**: Use the **publishable key** (`pk_test_...`). There is only one publishable key per mode (test/live); you don’t create a separate “API key” for the frontend.

### 1. Backend

- **medusa-config.ts** – Stripe is already registered in the Payment module (`@medusajs/medusa/payment-stripe`).
- **Environment** – In `.env` (copy from `.env.template`):
  - `STRIPE_API_KEY=sk_test_...` – Use the **Secret key** from [Stripe Dashboard → API keys](https://dashboard.stripe.com/apikeys) (Test mode).
  - `STRIPE_WEBHOOK_SECRET=whsec_...` – Optional; only needed for production webhooks.
- **Automatic capture** – In `medusa-config.ts`, the Stripe provider has `capture: true`, so the payment is captured automatically when the customer completes checkout. You do **not** need to manually capture in Admin. To hold funds and capture later (e.g. when you ship), set `capture: false` and capture from Admin.

### 2. Frontend

- In `.env` (copy from `.env.template`):
  - `NEXT_PUBLIC_STRIPE_KEY=pk_test_...` – Use the **Publishable key** from the same Stripe API keys page (Test mode).

### 3. Enable Stripe in your region

Stripe must be enabled per region:

1. Open **Medusa Admin** (e.g. `http://localhost:9000/app`).
2. Go to **Settings → Regions**.
3. Open the region you use (e.g. Denmark, India).
4. In **Payment providers**, enable **Stripe** (e.g. "Credit card (Test mode)" / `pp_stripe_stripe`).
5. Save.

After that, checkout will show **Credit card (Test mode)** alongside Manual Payment.

The storefront is configured to show only **Credit card (Test mode)** and **Manual Payment**. Other Stripe methods (Bancontact, BLIK, iDEAL, etc.) are hidden. To show them, edit `PAYMENT_IDS_TO_SHOW` in `src/modules/checkout/templates/checkout-form/index.tsx`.

### 4. No new window / popup

Stripe checkout uses **Stripe Elements**: the card form is embedded on the same checkout page. There is no redirect to Stripe and no popup — this is correct and expected.

### 5. Test cards (Stripe Test mode)

Use [Stripe test cards](https://docs.stripe.com/testing#cards), e.g.:

- **Success:** `4242 4242 4242 4242`
- **Decline:** `4000 0000 0000 0002`
- Use any future expiry and any 3-digit CVC.

---

## Razorpay

Medusa v2 does **not** ship an official Razorpay payment provider. Options:

- **Community packages** (e.g. `medusa-plugin-razorpay-v2`, `medusa-payment-razorpay`) are often built for Medusa v1 and may not work as-is with v2’s Payment Module and provider API.
- **Custom provider** – You can implement a Razorpay payment provider that follows [Medusa v2’s payment provider interface](https://docs.medusajs.com/resources/commerce-modules/payment/payment-provider) and register it in `medusa-config.ts` under the Payment module’s `providers` array.
- **Frontend** – Razorpay checkout usually uses their SDK (e.g. `react-razorpay`) and a custom checkout step, so the existing Stripe-based payment component would need a separate Razorpay flow or a dedicated “Pay with Razorpay” option that calls your backend to create/verify Razorpay orders.

For **testing**, Stripe (above) is the path of least resistance; Razorpay can be added later as a custom provider + frontend integration.
