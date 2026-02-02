import { getRegion } from "@lib/data/regions"
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
    const currencyCode = region?.currency_code ?? "inr"

    return <RechargeContent currencyCode={currencyCode} />
}
