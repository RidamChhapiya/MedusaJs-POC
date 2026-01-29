import { redirect } from "next/navigation"

/**
 * My Hub = regular account overview (profile, orders).
 * Redirect to /account so one place for hub.
 */
type MyHubPageProps = {
  params: Promise<{ countryCode: string }>
}

export default async function MyHubPage({ params }: MyHubPageProps) {
  const { countryCode } = await params
  redirect(`/${countryCode}/account`)
}
