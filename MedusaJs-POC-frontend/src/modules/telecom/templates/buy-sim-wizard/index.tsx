"use client"

import { useState, useEffect } from "react"
import { useAvailableNumbers, usePlans, usePurchaseSim, useVerifyKyc, useKycStatus } from "@lib/hooks/use-telecom"
import { AvailableNumber, Plan } from "types/telecom"
import { convertToLocale } from "@lib/util/money"
import { Button } from "@medusajs/ui"
import Spinner from "@modules/common/icons/spinner"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"
import { paymentInfoMap } from "@lib/constants"
import { CreditCard } from "@medusajs/icons"

type PaymentProvider = { id: string }

type BuySimWizardProps = {
    customer: HttpTypes.StoreCustomer | null
    currencyCode?: string
    paymentMethods?: PaymentProvider[]
}

export default function BuySimWizard({ customer, currencyCode = "inr", paymentMethods = [] }: BuySimWizardProps) {
    const [step, setStep] = useState<"number" | "kyc" | "plan" | "checkout" | "success">("number")
    const [selectedNumber, setSelectedNumber] = useState<AvailableNumber | null>(null)
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
    const [offset, setOffset] = useState(0)

    // Form States
    const [kycForm, setKycForm] = useState({
        kyc_type: "aadhaar",
        kyc_number: "",
        document_url: ""
    })
    const [checkoutForm, setCheckoutForm] = useState({
        shipping_address: "",
        shipping_city: "",
        shipping_state: "",
        shipping_pincode: "",
        shipping_landmark: ""
    })
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>(
        paymentMethods.find((p) => p.id === "pp_system_default")?.id ?? paymentMethods[0]?.id ?? "pp_system_default"
    )
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)

    // Data Hooks
    const { data: numbers, isLoading: isLoadingNumbers } = useAvailableNumbers(undefined, offset)
    const { data: plans, isLoading: isLoadingPlans } = usePlans()

    // Mutations
    const { mutate: purchaseSim, isPending: isPurchasing } = usePurchaseSim()
    const { mutate: verifyKyc, isPending: isSubmittingKyc } = useVerifyKyc()

    // Use actual customer ID if logged in.
    const CUSTOMER_ID = customer?.id

    // KYC Status Polling - Poll every 1 second to catch the verification update
    const { data: kycStatus } = useKycStatus(CUSTOMER_ID, { refetchInterval: 1000 })

    // Auto-advance if verified
    useEffect(() => {
        if (kycStatus?.kyc_status === "verified" && step === "kyc") {
            setStep("plan")
        }
    }, [kycStatus, step])

    const handleKycSubmit = () => {
        if (!CUSTOMER_ID) {
            alert("Please log in to proceed with KYC.")
            return
        }

        verifyKyc({
            customer_id: CUSTOMER_ID,
            ...kycForm
        }, {
            onSuccess: (data: any) => {
                alert(data.message)
                // Polling effect will handle transition to "plan" once status becomes "verified"
            },
            onError: (err: Error) => alert("KYC Submission Failed: " + err.message)
        })
    }

    const handlePurchase = () => {
        if (!CUSTOMER_ID) {
            alert("Please log in to purchase.")
            return
        }

        purchaseSim(
            {
                customer_id: CUSTOMER_ID,
                plan_id: selectedPlan!.id,
                preferred_number: selectedNumber!.msisdn,
                payment_method: selectedPaymentMethod === "pp_system_default" ? "manual" : selectedPaymentMethod,
                shipping_address: checkoutForm.shipping_address,
                shipping_city: checkoutForm.shipping_city,
                shipping_state: checkoutForm.shipping_state,
                shipping_pincode: checkoutForm.shipping_pincode,
                shipping_landmark: checkoutForm.shipping_landmark
            },
            {
                onSuccess: () => {
                    setIsConfirmModalOpen(false)
                    setStep("success")
                },
                onError: (err) => {
                    setIsConfirmModalOpen(false)
                    alert("Failed to purchase: " + err.message)
                },
            }
        )
    }

    if (!customer) {
        return (
            <div className="content-container py-12 text-center">
                <h1 className="text-3xl font-bold mb-8 text-ui-fg-base">Get Connected</h1>
                <p className="mb-8">Please log in to purchase a new SIM card.</p>
                <div className="flex gap-4 justify-center">
                    <LocalizedClientLink href="/account/login">
                        <Button>Log In</Button>
                    </LocalizedClientLink>
                    <LocalizedClientLink href="/account">
                        <Button variant="secondary">Register</Button>
                    </LocalizedClientLink>
                </div>
            </div>
        )
    }

    return (
        <div className="content-container py-12 relative">
            <h1 className="text-3xl font-bold mb-8 text-ui-fg-base">Get Connected</h1>

            {/* Progress Steps */}
            <div className="flex items-center gap-4 mb-12 text-sm text-ui-fg-subtle overflow-x-auto">
                <span className={step === "number" ? "font-bold text-ui-fg-base" : ""}>1. Number</span>
                <span>&gt;</span>
                <span className={step === "kyc" ? "font-bold text-ui-fg-base" : ""}>2. Verification</span>
                <span>&gt;</span>
                <span className={step === "plan" ? "font-bold text-ui-fg-base" : ""}>3. Plan</span>
                <span>&gt;</span>
                <span className={step === "checkout" ? "font-bold text-ui-fg-base" : ""}>4. Checkout</span>
            </div>

            {/* Step 1: Number Selection */}
            {step === "number" && (
                <div>
                    <h2 className="text-xl font-semibold mb-6">Select your new number</h2>
                    {isLoadingNumbers ? (
                        <div className="flex justify-center py-12"><Spinner /></div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                                {numbers?.map((num) => (
                                    <button
                                        key={num.msisdn}
                                        onClick={() => {
                                            setSelectedNumber(num)
                                            // Check early if verified to skip step 2
                                            if (kycStatus?.kyc_status === "verified") {
                                                setStep("plan")
                                            } else {
                                                setStep("kyc")
                                            }
                                        }}
                                        className="p-4 border rounded-lg hover:border-ui-fg-base hover:bg-ui-bg-base-hover transition-all text-left"
                                    >
                                        <div className="text-lg font-bold">{num.msisdn}</div>
                                        <div className="text-sm text-ui-fg-subtle">{num.region} • {num.tier}</div>
                                    </button>
                                ))}
                            </div>
                            <div className="flex justify-center">
                                <Button variant="secondary" onClick={() => setOffset(prev => prev + 10)} disabled={!numbers?.length}>
                                    Load Next 10 Numbers
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Step 2: KYC Verification */}
            {step === "kyc" && (
                <div className="max-w-xl mx-auto border rounded-xl p-8 bg-ui-bg-subtle">
                    <button onClick={() => setStep("number")} className="text-sm mb-6 underline">&larr; Back</button>
                    <h2 className="text-2xl font-bold mb-6">e-KYC Verification</h2>
                    <p className="mb-6 text-ui-fg-subtle">Verify your identity to activate {selectedNumber?.msisdn}.</p>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Document Type</label>
                            <select
                                className="w-full p-2 border rounded-md"
                                value={kycForm.kyc_type}
                                onChange={(e) => setKycForm({ ...kycForm, kyc_type: e.target.value })}
                            >
                                <option value="aadhaar">Aadhaar Card</option>
                                <option value="passport">Passport</option>
                                <option value="voter_id">Voter ID</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Document Number</label>
                            <input
                                type="text"
                                className="w-full p-2 border rounded-md"
                                placeholder="Enter document number"
                                value={kycForm.kyc_number}
                                onChange={(e) => setKycForm({ ...kycForm, kyc_number: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Document URL</label>
                            <input
                                type="text"
                                className="w-full p-2 border rounded-md"
                                placeholder="https://example.com/doc.pdf"
                                value={kycForm.document_url}
                                onChange={(e) => setKycForm({ ...kycForm, document_url: e.target.value })}
                            />
                            <p className="text-xs text-ui-fg-subtle mt-1">For POC, provide any public image URL or leave blank.</p>
                        </div>

                        <Button
                            className="w-full mt-4"
                            onClick={handleKycSubmit}
                            isLoading={isSubmittingKyc}
                        >
                            Submit for Verification
                        </Button>
                    </div>
                </div>
            )}

            {/* Step 3: Plan Selection */}
            {step === "plan" && (
                <div>
                    <button
                        onClick={() => setStep(kycStatus?.kyc_status === "verified" ? "number" : "kyc")}
                        className="text-sm mb-6 underline"
                    >
                        &larr; Back
                    </button>
                    <h2 className="text-xl font-semibold mb-2">Pick a plan for {selectedNumber?.msisdn}</h2>

                    {isLoadingPlans ? (
                        <div className="flex justify-center py-12"><Spinner /></div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {plans?.map((plan) => (
                                <div key={plan.id} className="border rounded-lg p-6 flex flex-col items-center text-center hover:shadow-md transition-shadow">
                                    <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                                    <div className="text-2xl font-bold mb-4">
                                        {convertToLocale({ amount: plan.price, currency_code: currencyCode })}
                                        <span className="text-sm font-normal text-ui-fg-subtle"> / {plan.duration} days</span>
                                    </div>
                                    <ul className="text-sm space-y-2 mb-6 text-ui-fg-subtle">
                                        <li>Data: {plan.data_limit} GB</li>
                                        <li>Voice: {plan.voice_limit} Mins</li>
                                        <li>SMS: {plan.sms_limit}</li>
                                    </ul>
                                    <Button
                                        onClick={() => {
                                            setSelectedPlan(plan)
                                            setStep("checkout")
                                        }}
                                        className="w-full"
                                    >
                                        Select
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Step 4: Checkout */}
            {step === "checkout" && selectedNumber && selectedPlan && (
                <div className="max-w-2xl mx-auto">
                    <button onClick={() => setStep("plan")} className="text-sm mb-6 underline">&larr; Back to plans</button>
                    <h2 className="text-2xl font-bold mb-6">Checkout & Shipping</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Order Summary */}
                        <div className="bg-ui-bg-subtle p-6 rounded-xl h-fit">
                            <h3 className="font-semibold mb-4">Order Summary</h3>
                            <div className="space-y-2 text-sm pb-4 border-b mb-4">
                                <div className="flex justify-between">
                                    <span>Number</span>
                                    <span className="font-medium">{selectedNumber.msisdn}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Plan</span>
                                    <span className="font-medium">{selectedPlan.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Duration</span>
                                    <span className="font-medium">{selectedPlan.duration} Days</span>
                                </div>
                            </div>
                            <div className="flex justify-between font-bold text-lg">
                                <span>Total</span>
                                <span>{convertToLocale({ amount: selectedPlan.price, currency_code: currencyCode })}</span>
                            </div>
                        </div>

                        {/* Payment & Shipping */}
                        <div className="space-y-6">
                            {/* Payment method (like cart checkout) */}
                            {paymentMethods.length > 0 && (
                                <div>
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

                            <div>
                                <label className="block text-sm font-medium mb-1">Address</label>
                                <input
                                    type="text"
                                    className="w-full p-2 border rounded-md"
                                    placeholder="Street Address"
                                    value={checkoutForm.shipping_address}
                                    onChange={(e) => setCheckoutForm({ ...checkoutForm, shipping_address: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-sm font-medium mb-1">City</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 border rounded-md"
                                        value={checkoutForm.shipping_city}
                                        onChange={(e) => setCheckoutForm({ ...checkoutForm, shipping_city: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">State</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 border rounded-md"
                                        value={checkoutForm.shipping_state}
                                        onChange={(e) => setCheckoutForm({ ...checkoutForm, shipping_state: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Pincode</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 border rounded-md"
                                        placeholder="Pincode"
                                        value={checkoutForm.shipping_pincode}
                                        onChange={(e) => setCheckoutForm({ ...checkoutForm, shipping_pincode: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Landmark</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 border rounded-md"
                                        value={checkoutForm.shipping_landmark}
                                        onChange={(e) => setCheckoutForm({ ...checkoutForm, shipping_landmark: e.target.value })}
                                    />
                                </div>
                            </div>

                            <Button
                                size="large"
                                className="w-full mt-6"
                                onClick={() => setIsConfirmModalOpen(true)}
                                disabled={!checkoutForm.shipping_address}
                            >
                                Proceed to Pay
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            {isConfirmModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-grey-90 p-8 rounded-xl max-w-md w-full shadow-2xl">
                        <h3 className="text-xl font-bold mb-4">Confirm Purchase</h3>
                        <p className="mb-6 text-ui-fg-subtle">
                            Please verify your details. You are about to purchase <strong>{selectedPlan?.name}</strong> for number <strong>{selectedNumber?.msisdn}</strong>.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <Button variant="secondary" onClick={() => setIsConfirmModalOpen(false)}>Cancel</Button>
                            <Button onClick={handlePurchase} isLoading={isPurchasing}>Confirm & Pay</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Success */}
            {step === "success" && (
                <div className="text-center py-12">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">✓</div>
                    <h2 className="text-2xl font-bold mb-2">Order Successful!</h2>
                    <p className="text-ui-fg-subtle mb-8">Your new SIM for {selectedNumber?.msisdn} will be shipped to {checkoutForm.shipping_city}.</p>
                    <LocalizedClientLink href="/account">
                        <Button variant="secondary">Go to My Hub</Button>
                    </LocalizedClientLink>
                </div>
            )}
        </div>
    )
}
