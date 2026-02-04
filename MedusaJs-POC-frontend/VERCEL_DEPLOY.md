# Deploy frontend to Vercel (backend on ngrok or Render)

Backend URL used in this guide: **https://unkneaded-davian-unpeeled.ngrok-free.dev**

## 1. Environment variables on Vercel

In Vercel: your project → **Settings** → **Environment Variables**. Add these (for Production, Preview, Development as needed):

| Variable | Value | Notes |
|----------|--------|--------|
| `MEDUSA_BACKEND_URL` | `https://unkneaded-davian-unpeeled.ngrok-free.dev` | Server-side (middleware, SDK). Use your ngrok URL or final Render URL. |
| `NEXT_PUBLIC_TELECOM_BACKEND_URL` | `https://unkneaded-davian-unpeeled.ngrok-free.dev` | Client-side telecom API (buy SIM, recharge). Same as above. |
| `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` | `pk_...` | From Medusa Admin (Settings → Publishable API Keys). |
| `NEXT_PUBLIC_BASE_URL` | `https://your-app.vercel.app` | Your Vercel app URL (e.g. after first deploy). |
| `NEXT_PUBLIC_DEFAULT_REGION` | `in` or `us` | Default region code. |
| `NEXT_PUBLIC_SC_ID_IN` | `sc_01...` | Sales channel ID (India), if used. |
| `NEXT_PUBLIC_SC_ID_FR` | `sc_01...` | Sales channel ID (France), if used. |
| `NEXT_PUBLIC_STRIPE_KEY` | `pk_test_...` | Stripe publishable key for checkout. |
| `REVALIDATE_SECRET` | (any secret string) | For on-demand revalidation. |

Optional: `NEXT_PUBLIC_MEDUSA_PAYMENTS_PUBLISHABLE_KEY`, `NEXT_PUBLIC_MEDUSA_PAYMENTS_ACCOUNT_ID` if you use Medusa Payments.

## 2. Backend CORS (required)

Your Medusa backend must allow requests from the Vercel frontend origin. Set this in the **backend** (e.g. in Render env or backend `.env`):

- **STORE_CORS** = `https://your-app.vercel.app`  
  Or comma-separated: `https://your-app.vercel.app,https://unkneaded-davian-unpeeled.ngrok-free.dev`

If you use a custom domain on Vercel, add that too, e.g. `https://your-domain.com`.

Restart the backend after changing CORS.

## 3. ngrok notes

- **Free ngrok URLs change** each time you restart ngrok (unless you use a reserved domain). When the URL changes, update `MEDUSA_BACKEND_URL` and `NEXT_PUBLIC_TELECOM_BACKEND_URL` on Vercel and redeploy or trigger a redeploy.
- When you move the backend to **Render**, set both variables to your Render URL (e.g. `https://your-service.onrender.com`) and add that URL to **STORE_CORS** on the backend.

## 4. Deploy on Vercel

- Connect the repo (e.g. `MedusaJs-POC`), set **Root Directory** to `MedusaJs-POC-frontend`.
- Build command: `npm run build` (or leave default).
- No need to set a custom start command (Vercel uses its own for Next.js).

After deploy, open `https://your-app.vercel.app` and confirm store and checkout work against your backend.
