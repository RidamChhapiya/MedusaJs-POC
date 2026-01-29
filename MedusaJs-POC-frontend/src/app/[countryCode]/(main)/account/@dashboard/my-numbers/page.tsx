import { redirect } from "next/navigation"

/**
 * My numbers lives at /my-numbers (standalone).
 * Redirect old /account/my-numbers to canonical URL.
 */
type PageProps = {
  params: Promise<{ countryCode: string }>
}

export default async function MyNumbersRedirectPage({ params }: PageProps) {
  const { countryCode } = await params
  redirect(`/${countryCode}/my-numbers`)
}
