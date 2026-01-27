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
  }>
  params: Promise<{
    countryCode: string
  }>
}

import { listCategories } from "@lib/data/categories"

export default async function StorePage(props: Params) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const { sortBy, page, type } = searchParams

  // Fetch categories to get their IDs
  // We fetch all top-level categories or filter by handle if API supports array (it usually supports single handle or list)
  // Let's fetch list and find them in memory to save calls or simple list
  const categories = await listCategories({ limit: 100 })

  const smartphones = categories.find(c => c.handle === "smartphones")
  const accessories = categories.find(c => c.handle === "accessories")

  return (
    <StoreTemplate
      sortBy={sortBy}
      page={page}
      countryCode={params.countryCode}
      categories={{ smartphones, accessories }}
      activeType={type || "smartphones"}
    />
  )
}
