import { Metadata } from "next"

import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import StoreTemplate from "@modules/store/templates"

export const metadata: Metadata = {
  title: "Store",
  description: "Explore all of our products.",
}

type Params = {
  searchParams: Promise<{
    sortBy?: SortOptions
    page?: string
    type?: string
    q?: string
  }>
  params: Promise<{
    countryCode: string
  }>
}

import { listCategories } from "@lib/data/categories"

export default async function StorePage(props: Params) {
  const params = await props.params
  const searchParams = await props.searchParams
  const { sortBy, page, type, q } = searchParams

  const categories = await listCategories({ limit: 100 })

  const smartphones = categories.find((c) => c.handle === "smartphones")
  const accessories = categories.find((c) => c.handle === "accessories")

  const activeType =
    type === "accessories" ? "accessories" : type === "smartphones" ? "smartphones" : "all"

  return (
    <StoreTemplate
      sortBy={sortBy}
      page={page}
      countryCode={params.countryCode}
      categories={{ smartphones, accessories }}
      activeType={activeType}
      searchQuery={q}
    />
  )
}
