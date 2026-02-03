import { retrieveCustomer } from "@lib/data/customer"
import { getRegion } from "@lib/data/regions"
import { listCartPaymentMethods } from "@lib/data/payment"
import BuySimWizard from "@modules/telecom/templates/buy-sim-wizard"
import { Metadata } from "next"

export const metadata: Metadata = {
    title: "Get Connected - Nexel",
    description: "Purchase a new SIM card and get connected with Nexel.",
}

type Props = { params: Promise<{ countryCode: string }> }

export default async function BuySimPage(props: Props) {
    const params = await props.params
    const [customer, region] = await Promise.all([
        retrieveCustomer().catch(() => null),
        getRegion(params.countryCode).catch(() => null),
    ])
    const paymentMethods = region?.id
        ? await listCartPaymentMethods(region.id).then((p) => p ?? [])
        : []

    return (
        <BuySimWizard
            customer={customer}
            currencyCode={region?.currency_code ?? "inr"}
            regionId={region?.id ?? undefined}
            paymentMethods={paymentMethods}
        />
    )
}
