"use client"

import { useState } from "react"
import { Text, Button, Input, Label, Textarea } from "@medusajs/ui"
import Accordion from "@modules/products/components/product-tabs/accordion"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const faqs = [
  {
    question: "How do I track my order?",
    answer:
      "Once your order ships, you'll receive an email with a tracking link. You can also view order status and tracking from your account under Orders. Log in and click the order to see the latest updates.",
  },
  {
    question: "What is your return policy?",
    answer:
      "We offer returns within 30 days of delivery for most items in unused condition. Devices and SIMs may have different terms—check the product page or your order confirmation. Start a return from your account Orders page.",
  },
  {
    question: "How do I recharge my number?",
    answer:
      "Go to Recharge from the main menu, enter your mobile number, choose a plan or amount, and complete payment. Recharges are applied immediately. You can also save numbers in My Numbers for quick top-ups.",
  },
  {
    question: "How do I get a new SIM?",
    answer:
      "Use Buy SIM from the main menu. Select your plan, enter your delivery address and payment details, and we'll ship your SIM. Activation instructions are included in the pack.",
  },
  {
    question: "How can I update my account or address?",
    answer:
      "Sign in and go to Account. From there you can update your profile, email, password, and saved addresses. Changes take effect right away.",
  },
  {
    question: "Who do I contact for business or bulk plans?",
    answer:
      "For enterprise solutions, dedicated account management, and custom plans, use our For Business page to submit an enquiry. Our team will get back to you within 24 hours.",
  },
]

export default function CustomerServicePage() {
  return (
    <div className="content-container py-12 small:py-16">
      <div className="max-w-3xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-ui-fg-base mb-4">
            Customer Service
          </h1>
          <Text className="text-ui-fg-subtle text-lg">
            Find answers to common questions below. Need more help? Reach out via
            the contact options at the bottom of this page.
          </Text>
        </div>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-ui-fg-base mb-6">
            Frequently asked questions
          </h2>
          <Accordion type="single" collapsible>
            {faqs.map((faq, i) => (
              <Accordion.Item
                key={i}
                title={faq.question}
                value={`faq-${i}`}
                headingSize="medium"
              >
                <Text className="text-ui-fg-subtle pt-2">{faq.answer}</Text>
              </Accordion.Item>
            ))}
          </Accordion>
        </section>

        <section className="border-t border-ui-border-base pt-8 mb-12">
          <h2 className="text-xl font-semibold text-ui-fg-base mb-4">
            Still need help?
          </h2>
          <div className="text-ui-fg-subtle txt-medium mb-6">
            Check your{" "}
            <LocalizedClientLink href="/account/orders" className="text-ui-fg-interactive hover:underline">
              order history
            </LocalizedClientLink>{" "}
            or{" "}
            <LocalizedClientLink href="/account" className="text-ui-fg-interactive hover:underline">
              account settings
            </LocalizedClientLink>.
            For business enquiries, use{" "}
            <LocalizedClientLink href="/business" className="text-ui-fg-interactive hover:underline">
              For Business
            </LocalizedClientLink>.
          </div>

          <h3 className="text-lg font-semibold text-ui-fg-base mb-4">Contact us</h3>
          <ContactForm />
        </section>
      </div>
    </div>
  )
}

function ContactForm() {
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="rounded-lg border border-ui-border-base bg-ui-bg-subtle p-6 text-center">
        <Text className="text-ui-fg-base font-medium">Message sent</Text>
        <Text className="text-ui-fg-subtle text-sm mt-1">
          We&apos;ll get back to you as soon as we can.
        </Text>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="contact-name">Name</Label>
          <Input id="contact-name" name="name" placeholder="Your name" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact-email">Email</Label>
          <Input id="contact-email" name="email" type="email" placeholder="you@example.com" required />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="contact-message">Message</Label>
        <Textarea id="contact-message" name="message" placeholder="How can we help?" className="min-h-[120px]" required />
      </div>
      <Button type="submit" size="large">Send message</Button>
    </form>
  )
}
