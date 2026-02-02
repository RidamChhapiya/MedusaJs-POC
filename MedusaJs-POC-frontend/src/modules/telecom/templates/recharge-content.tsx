"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { useRecharge, usePlans } from "@lib/hooks/use-telecom"
import { Plan } from "types/telecom"
import { convertToLocale } from "@lib/util/money"
import { Button, Input, Label } from "@medusajs/ui"
import Spinner from "@modules/common/icons/spinner"

type RechargeContentProps = { currencyCode?: string }

export default function RechargeContent({ currencyCode = "inr" }: RechargeContentProps) {
    const searchParams = useSearchParams()
    const numberFromQuery = searchParams.get("number") ?? ""
    const [phone, setPhone] = useState("")
    const [step, setStep] = useState<"phone" | "plan" | "success">("phone")

    useEffect(() => {
        if (numberFromQuery && numberFromQuery.length > 0) {
            setPhone(numberFromQuery)
            if (numberFromQuery.length > 5) setStep("plan")
        }
    }, [numberFromQuery])
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)

    const { data: plans, isLoading: isLoadingPlans } = usePlans()
    const { mutate: recharge, isPending: isRecharging } = useRecharge()

    const handlePhoneSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (phone.length > 5) {
            setStep("plan")
        }
    }

    const handleRecharge = () => {
        if (!selectedPlan || !phone) return

        recharge(
            { nexel_number: phone, plan_id: selectedPlan.id },
            {
                onSuccess: () => setStep("success"),
                onError: (err) => alert("Recharge failed: " + err.message)
            }
        )
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
                                    placeholder="Enter 10-digit number"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    required
                                />
                            </div>
                            <Button type="submit" className="w-full" size="large">Proceed to Plans</Button>
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

                        <div className="mt-8 pt-4 border-t">
                            <Button
                                disabled={!selectedPlan}
                                isLoading={isRecharging}
                                onClick={handleRecharge}
                                className="w-full"
                                size="large"
                            >
                                Pay {selectedPlan ? convertToLocale({ amount: selectedPlan.price, currency_code: currencyCode }) : ""}
                            </Button>
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
