import { getRegion } from "@lib/data/regions"
import { listCartPaymentMethods } from "@lib/data/payment"
import RechargeContent from "@modules/telecom/templates/recharge-content"
import { Metadata } from "next"

export const metadata: Metadata = {
    title: "Recharge - Nexel",
    description: "Top up your mobile or data plan.",
}

type Props = { params: Promise<{ countryCode: string }> }

export default async function RechargePage(props: Props) {
    const params = await props.params
    const region = await getRegion(params.countryCode).catch(() => null)
    const paymentMethods = region?.id
        ? await listCartPaymentMethods(region.id).catch(() => [])
        : []
    const currencyCode = region?.currency_code ?? "inr"
    const PAYMENT_IDS_TO_SHOW = ["pp_stripe_stripe", "pp_system_default"]
    const filteredPaymentMethods = Array.isArray(paymentMethods)
        ? paymentMethods.filter((p: { id?: string }) => PAYMENT_IDS_TO_SHOW.includes(p?.id ?? ""))
        : []

    return (
        <RechargeContent
            currencyCode={currencyCode}
            regionId={region?.id}
            paymentMethods={filteredPaymentMethods}
        />
    )
}
