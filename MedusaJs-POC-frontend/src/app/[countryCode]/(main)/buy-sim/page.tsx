import { retrieveCustomer } from "@lib/data/customer"
import BuySimWizard from "@modules/telecom/templates/buy-sim-wizard"
import { Metadata } from "next"

export const metadata: Metadata = {
    title: "Get Connected - Nexel",
    description: "Purchase a new SIM card and get connected with Nexel.",
}

export default async function BuySimPage() {
    const customer = await retrieveCustomer().catch(() => null)

    return <BuySimWizard customer={customer} />
}
