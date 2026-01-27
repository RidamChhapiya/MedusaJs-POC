"use client"

import { useState } from "react"
import { Button, Input, Label, Textarea } from "@medusajs/ui"

export default function BusinessPage() {
    const [submitted, setSubmitted] = useState(false)

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        // Mock submission
        setTimeout(() => setSubmitted(true), 1000)
    }

    return (
        <div className="content-container py-12">
            <div className="grid md:grid-cols-2 gap-16 items-center">
                <div>
                    <h1 className="text-4xl font-bold mb-6 text-ui-fg-base">Enterprise Connectivity Solutions</h1>
                    <p className="text-lg text-ui-fg-subtle mb-6">
                        Empower your workforce with our reliable, high-speed corporate plans.
                        Get dedicated account support, fleet management, and pooled data.
                    </p>
                    <ul className="space-y-4 mb-8">
                        <li className="flex items-center gap-3">
                            <span className="text-green-500">✓</span> Dedicated Account Manager
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="text-green-500">✓</span> Customized Data Pools
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="text-green-500">✓</span> Priority Support 24/7
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="text-green-500">✓</span> International Roaming Packages
                        </li>
                    </ul>
                </div>

                <div className="bg-ui-bg-subtle p-8 rounded-xl border">
                    {submitted ? (
                        <div className="text-center py-12">
                            <h2 className="text-2xl font-bold mb-4">Request Received</h2>
                            <p className="text-ui-fg-subtle">Our team will contact you within 24 hours.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <h2 className="text-xl font-bold mb-6">Contact Sales</h2>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>First Name</Label>
                                    <Input required placeholder="Ex. John" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Last Name</Label>
                                    <Input required placeholder="Ex. Doe" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Work Email</Label>
                                <Input type="email" required placeholder="john@company.com" />
                            </div>

                            <div className="space-y-2">
                                <Label>Company Name</Label>
                                <Input required placeholder="Acme Corp" />
                            </div>

                            <div className="space-y-2">
                                <Label>Employees</Label>
                                <Input type="number" placeholder="Est. number of lines needed" />
                            </div>

                            <div className="space-y-2">
                                <Label>Message</Label>
                                <Textarea placeholder="Tell us about your requirements..." className="min-h-[100px]" />
                            </div>

                            <Button type="submit" size="large" className="w-full">Submit Request</Button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}
