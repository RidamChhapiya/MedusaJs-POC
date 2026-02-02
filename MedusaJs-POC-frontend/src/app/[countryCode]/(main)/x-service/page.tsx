import { Metadata } from "next"
import OrderInboxClient from "./order-inbox-client"

export const metadata: Metadata = {
  title: "X Service – Order webhook inbox",
  description: "Testing: orders received when Place order / recharge / SIMs / accessories complete.",
}

export default function XServicePage() {
  return <OrderInboxClient />
}
