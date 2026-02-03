"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { useRecharge, usePlans } from "@lib/hooks/use-telecom"
import { Plan } from "types/telecom"
import { convertToLocale } from "@lib/util/money"
import { Button, Input, Label } from "@medusajs/ui"
import Spinner from "@modules/common/icons/spinner"
import { paymentInfoMap, isStripeLike } from "@lib/constants"
import { CreditCard } from "@medusajs/icons"
import { telecomClient } from "@lib/telecom-client"
import BuySimStripeCardModal from "@modules/telecom/components/buy-sim-stripe-modal"

type PaymentProvider = { id: string }

type StripeSession = {
    client_secret: string
    payment_collection_id: string
    payment_session_id: string
}

type RechargeContentProps = {
    currencyCode?: string
    regionId?: string
    paymentMethods?: PaymentProvider[]
}

export default function RechargeContent({
    currencyCode = "inr",
    regionId,
    paymentMethods = [],
}: RechargeContentProps) {
    const searchParams = useSearchParams()
    const numberFromQuery = searchParams.get("number") ?? ""
    const [phone, setPhone] = useState("")
    const [step, setStep] = useState<"phone" | "plan" | "success">("phone")

    useEffect(() => {
        if (!numberFromQuery || numberFromQuery.length < 5) return
        setPhone(numberFromQuery)
        setNumberError(null)
        setIsValidatingNumber(true)
        telecomClient
            .get<{ valid: boolean; message?: string }>(
                `/store/telecom/recharge/validate-number/${encodeURIComponent(numberFromQuery.trim())}`
            )
            .then((res) => {
                if (res.valid) {
                    setNumberError(null)
                    setStep("plan")
                } else {
                    setNumberError(res.message ?? "This number cannot be recharged.")
                }
            })
            .catch(() => setNumberError("Unable to check number. Please try again."))
            .finally(() => setIsValidatingNumber(false))
    }, [numberFromQuery])
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>(
        paymentMethods.find((p) => p.id === "pp_system_default")?.id ?? paymentMethods[0]?.id ?? "pp_system_default"
    )
    const [stripeSession, setStripeSession] = useState<StripeSession | null>(null)
    const [stripeSessionError, setStripeSessionError] = useState<string | null>(null)
    const [numberError, setNumberError] = useState<string | null>(null)
    const [isValidatingNumber, setIsValidatingNumber] = useState(false)

    const { data: plans, isLoading: isLoadingPlans } = usePlans()
    const { mutate: recharge, isPending: isRecharging } = useRecharge()

    const validateNumber = async (numberToCheck: string): Promise<boolean> => {
        if (!numberToCheck || numberToCheck.trim().length < 5) {
            setNumberError("Please enter a valid phone number.")
            return false
        }
        setNumberError(null)
        setIsValidatingNumber(true)
        try {
            const res = await telecomClient.get<{ valid: boolean; message?: string }>(
                `/store/telecom/recharge/validate-number/${encodeURIComponent(numberToCheck.trim())}`
            )
            if (res.valid) {
                setNumberError(null)
                return true
            }
            setNumberError(res.message ?? "This number cannot be recharged.")
            return false
        } catch {
            setNumberError("Unable to check number. Please try again.")
            return false
        } finally {
            setIsValidatingNumber(false)
        }
    }

    const handlePhoneSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const num = phone.trim()
        if (num.length < 5) {
            setNumberError("Please enter a valid phone number.")
            return
        }
        const ok = await validateNumber(num)
        if (ok) setStep("plan")
    }

    const handleRecharge = (paymentCollectionId?: string, paymentSessionId?: string) => {
        if (!selectedPlan || !phone) return

        recharge(
            {
                nexel_number: phone,
                plan_id: selectedPlan.id,
                payment_method: selectedPaymentMethod === "pp_system_default" ? "manual" : selectedPaymentMethod,
                ...(paymentCollectionId && paymentSessionId
                    ? { payment_collection_id: paymentCollectionId, payment_session_id: paymentSessionId }
                    : {}),
            },
            {
                onSuccess: () => {
                    setStripeSession(null)
                    setStep("success")
                },
                onError: (err) => {
                    setStripeSession(null)
                    alert("Recharge failed: " + err.message)
                },
            }
        )
    }

    const handlePayClick = async () => {
        if (!selectedPlan || !phone) return
        if (isStripeLike(selectedPaymentMethod)) {
            if (!regionId) {
                setStripeSessionError("Region not available. Please refresh and try again.")
                return
            }
            setStripeSessionError(null)
            try {
                const res = await telecomClient.post<{
                    client_secret: string
                    payment_collection_id: string
                    payment_session_id: string
                }>("/store/telecom/recharge/create-stripe-session", {
                    plan_id: selectedPlan.id,
                    amount: selectedPlan.price,
                    currency_code: currencyCode,
                    region_id: regionId,
                })
                setStripeSession({
                    client_secret: res.client_secret,
                    payment_collection_id: res.payment_collection_id,
                    payment_session_id: res.payment_session_id,
                })
            } catch (err) {
                setStripeSessionError(err instanceof Error ? err.message : "Could not start payment.")
            }
        } else {
            handleRecharge()
        }
    }

    return (
        <div className="content-container py-12 flex justify-center">
            <div className="w-full max-w-lg border rounded-xl p-8 shadow-sm">
                <h1 className="text-3xl font-bold mb-2">Instant Recharge</h1>
                <p className="text-ui-fg-subtle mb-8">Top up your mobile or data plan in seconds.</p>

                {step === "phone" && (
                    <form onSubmit={handlePhoneSubmit}>
                        <div className="space-y-4">
                            <div className="flex flex-col gap-2">
                                <Label>Phone Number</Label>
                                <Input
                                    placeholder="Enter 10-digit Nexel number"
                                    value={phone}
                                    onChange={(e) => {
                                        setPhone(e.target.value)
                                        setNumberError(null)
                                    }}
                                    required
                                />
                                {numberError && (
                                    <p className="text-small-regular text-red-500" role="alert">
                                        {numberError}
                                    </p>
                                )}
                            </div>
                            <Button
                                type="submit"
                                className="w-full"
                                size="large"
                                disabled={isValidatingNumber}
                                isLoading={isValidatingNumber}
                            >
                                {isValidatingNumber ? "Checking number…" : "Proceed to Plans"}
                            </Button>
                        </div>
                    </form>
                )}

                {step === "plan" && (
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <p className="font-medium">Recharging: {phone}</p>
                            <button onClick={() => setStep("phone")} className="text-sm underline text-ui-fg-subtle">Change</button>
                        </div>

                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                            {isLoadingPlans ? (
                                <div className="flex justify-center p-4">
                                    <Spinner />
                                </div>
                            ) : plans?.map(plan => (
                                <div
                                    key={plan.id}
                                    onClick={() => setSelectedPlan(plan)}
                                    className={`p-4 border rounded-lg cursor-pointer transition-all ${selectedPlan?.id === plan.id ? 'border-ui-fg-base bg-ui-bg-base-hover' : 'hover:border-gray-400'}`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-bold">{plan.name}</span>
                                        <span className="font-bold">
                                            {convertToLocale({ amount: plan.price, currency_code: currencyCode })}
                                        </span>
                                    </div>
                                    <div className="flex gap-4 text-xs text-ui-fg-subtle">
                                        <span>{plan.data_limit}GB Data</span>
                                        <span>{plan.voice_limit} Min</span>
                                        <span>{plan.duration || 30} Days</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {paymentMethods.length > 0 && (
                            <div className="mt-6">
                                <h3 className="text-sm font-semibold mb-3 text-ui-fg-base">Payment method</h3>
                                <div className="space-y-2">
                                    {paymentMethods.map((pm) => (
                                        <label
                                            key={pm.id}
                                            className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-ui-bg-subtle has-[:checked]:border-ui-fg-interactive has-[:checked]:bg-ui-bg-base-hover"
                                        >
                                            <input
                                                type="radio"
                                                name="payment"
                                                value={pm.id}
                                                checked={selectedPaymentMethod === pm.id}
                                                onChange={() => setSelectedPaymentMethod(pm.id)}
                                                className="sr-only"
                                            />
                                            <span className="flex items-center gap-2 text-ui-fg-base">
                                                {paymentInfoMap[pm.id]?.icon ?? <CreditCard className="size-4" />}
                                                {paymentInfoMap[pm.id]?.title ?? pm.id}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {stripeSessionError && (
                            <p className="text-small-regular text-red-500 mt-2">{stripeSessionError}</p>
                        )}
                        <div className="mt-8 pt-4 border-t">
                            <Button
                                disabled={!selectedPlan}
                                isLoading={isRecharging}
                                onClick={handlePayClick}
                                className="w-full"
                                size="large"
                            >
                                Pay {selectedPlan ? convertToLocale({ amount: selectedPlan.price, currency_code: currencyCode }) : ""}
                            </Button>
                        </div>
                    </div>
                )}

                {/* Stripe card modal */}
                {stripeSession && selectedPlan && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-white dark:bg-ui-bg-base p-8 rounded-xl max-w-md w-full shadow-2xl">
                            <h3 className="text-xl font-bold mb-2">Pay with card</h3>
                            <p className="text-ui-fg-subtle mb-4">
                                Recharge {phone} – {selectedPlan.name}
                            </p>
                            <BuySimStripeCardModal
                                clientSecret={stripeSession.client_secret}
                                paymentCollectionId={stripeSession.payment_collection_id}
                                paymentSessionId={stripeSession.payment_session_id}
                                onConfirm={(paymentCollectionId, paymentSessionId) =>
                                    handleRecharge(paymentCollectionId, paymentSessionId)
                                }
                                onCancel={() => setStripeSession(null)}
                                isSubmitting={isRecharging}
                            />
                        </div>
                    </div>
                )}

                {step === "success" && (
                    <div className="text-center py-6">
                        <div className="w-14 h-14 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-xl">✓</div>
                        <h2 className="text-xl font-bold mb-2">Recharge Successful!</h2>
                        <p className="text-ui-fg-subtle mb-6">Your plan has been activated for {phone}.</p>
                        <Button onClick={() => { setStep("phone"); setPhone(""); setSelectedPlan(null) }} variant="secondary">Recharge Another</Button>
                    </div>
                )}
            </div>
        </div>
    )
}
