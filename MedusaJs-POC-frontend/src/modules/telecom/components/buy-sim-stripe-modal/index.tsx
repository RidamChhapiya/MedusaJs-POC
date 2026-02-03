"use client"

import { useState } from "react"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js"
import { Button, Text } from "@medusajs/ui"
import { StripeCardElementOptions } from "@stripe/stripe-js"

const stripeKey =
  process.env.NEXT_PUBLIC_STRIPE_KEY ||
  process.env.NEXT_PUBLIC_MEDUSA_PAYMENTS_PUBLISHABLE_KEY
const stripePromise = stripeKey ? loadStripe(stripeKey) : null

type BuySimStripeModalProps = {
  clientSecret: string
  paymentCollectionId: string
  paymentSessionId: string
  onConfirm: (paymentCollectionId: string, paymentSessionId: string) => void
  onCancel: () => void
  isSubmitting?: boolean
  billingName?: string
  billingEmail?: string
}

function StripeCardForm({
  clientSecret,
  paymentCollectionId,
  paymentSessionId,
  onSuccess,
  onCancel,
  isSubmitting,
  billingName,
  billingEmail,
}: {
  clientSecret: string
  paymentCollectionId: string
  paymentSessionId: string
  onSuccess: (paymentCollectionId: string, paymentSessionId: string) => void
  onCancel: () => void
  isSubmitting?: boolean
  billingName?: string
  billingEmail?: string
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const cardOptions: StripeCardElementOptions = {
    style: {
      base: {
        fontFamily: "Inter, sans-serif",
        color: "#424270",
        "::placeholder": { color: "rgb(107 114 128)" },
      },
    },
    classes: {
      base: "pt-3 pb-1 block w-full h-11 px-4 mt-0 bg-ui-bg-field border rounded-md appearance-none focus:outline-none focus:ring-0 focus:shadow-borders-interactive-with-active border-ui-border-base hover:bg-ui-bg-field-hover transition-all duration-300 ease-in-out",
    },
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return
    const card = elements.getElement("card")
    if (!card) return

    setError(null)
    setLoading(true)
    try {
      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card,
          billing_details: {
            name: billingName ?? undefined,
            email: billingEmail ?? undefined,
          },
        },
      })
      if (confirmError) {
        setError(confirmError.message ?? "Payment failed")
        setLoading(false)
        return
      }
      if (
        paymentIntent &&
        (paymentIntent.status === "succeeded" || paymentIntent.status === "requires_capture")
      ) {
        onSuccess(paymentCollectionId, paymentSessionId)
      } else {
        setError("Payment could not be completed.")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed")
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Text className="text-ui-fg-base">Enter your card details:</Text>
      <div className="rounded-md border border-ui-border-base bg-ui-bg-field p-3">
        <CardElement options={cardOptions} onChange={(e) => setError(e.error?.message ?? null)} />
      </div>
      {error && (
        <p className="text-small-regular text-red-500" role="alert">
          {error}
        </p>
      )}
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading || isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={!stripe || loading || isSubmitting}>
          {loading || isSubmitting ? "Processing…" : "Confirm & Pay"}
        </Button>
      </div>
    </form>
  )
}

export default function BuySimStripeCardModal({
  clientSecret,
  paymentCollectionId,
  paymentSessionId,
  onConfirm,
  onCancel,
  isSubmitting = false,
  billingName,
  billingEmail,
}: BuySimStripeModalProps) {
  if (!stripePromise) {
    return (
      <div className="p-6">
        <Text className="text-red-500">Stripe is not configured. Set NEXT_PUBLIC_STRIPE_KEY.</Text>
        <Button variant="secondary" onClick={onCancel} className="mt-4">
          Close
        </Button>
      </div>
    )
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: { theme: "stripe" },
      }}
    >
      <StripeCardForm
        clientSecret={clientSecret}
        paymentCollectionId={paymentCollectionId}
        paymentSessionId={paymentSessionId}
        onSuccess={onConfirm}
        onCancel={onCancel}
        isSubmitting={isSubmitting}
        billingName={billingName}
        billingEmail={billingEmail}
      />
    </Elements>
  )
}
