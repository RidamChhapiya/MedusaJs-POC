import { Suspense } from "react"

import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import RefinementList from "@modules/store/components/refinement-list"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import StoreSearchBar from "@modules/store/components/store-search-bar"

import PaginatedProducts from "./paginated-products"

import { StoreProductCategory } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const StoreTemplate = ({
  sortBy,
  page,
  countryCode,
  categories,
  activeType,
  searchQuery,
}: {
  sortBy?: SortOptions
  page?: string
  countryCode: string
  categories: {
    smartphones?: StoreProductCategory
    accessories?: StoreProductCategory
  }
  activeType: "all" | "smartphones" | "accessories"
  searchQuery?: string
}) => {
  const pageNumber = page ? parseInt(page, 10) : 1
  const sort = sortBy || "created_at"

  const activeCategoryId =
    activeType === "smartphones"
      ? categories.smartphones?.id
      : activeType === "accessories"
        ? categories.accessories?.id
        : undefined

  const tabClass = (active: boolean) =>
    `px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
      active
        ? "bg-ui-bg-base text-ui-fg-base shadow-sm border border-ui-border-base"
        : "text-ui-fg-subtle hover:text-ui-fg-base hover:bg-ui-bg-subtle/80"
    }`

  const baseHref = (type: string) =>
    searchQuery?.trim()
      ? `/store?type=${type}&q=${encodeURIComponent(searchQuery)}`
      : `/store?type=${type}`

  return (
    <div
      className="flex flex-col small:flex-row small:items-start py-8 content-container bg-white dark:bg-grey-80 min-h-screen"
      data-testid="category-container"
    >
      <RefinementList sortBy={sort} searchQuery={searchQuery} />

      <div className="w-full min-w-0">
        <div className="mb-10">
          <h1
            data-testid="store-page-title"
            className="text-3xl small:text-4xl font-bold text-ui-fg-base tracking-tight mb-6"
          >
            Gear & Tech
          </h1>

          <div className="rounded-2xl border border-ui-border-base bg-ui-bg-subtle/50 p-5 small:p-6 mb-6">
            <StoreSearchBar searchQuery={searchQuery} activeType={activeType} sortBy={sort} />

            <div className="mt-5 pt-5 border-t border-ui-border-base">
              <span className="text-sm font-medium text-ui-fg-muted block mb-3">Category</span>
              <div className="flex gap-2 flex-wrap">
                <LocalizedClientLink href={baseHref("all")} className={tabClass(activeType === "all")}>
                  All
                </LocalizedClientLink>
                <LocalizedClientLink href={baseHref("smartphones")} className={tabClass(activeType === "smartphones")}>
                  Smartphones
                </LocalizedClientLink>
                <LocalizedClientLink href={baseHref("accessories")} className={tabClass(activeType === "accessories")}>
                  Accessories
                </LocalizedClientLink>
              </div>
            </div>
          </div>
        </div>

        {activeType === "all" || activeCategoryId ? (
          <Suspense fallback={<SkeletonProductGrid />}>
            <PaginatedProducts
              sortBy={sort}
              page={pageNumber}
              countryCode={countryCode}
              categoryId={activeCategoryId}
              q={searchQuery}
            />
          </Suspense>
        ) : (
          <div className="py-16 rounded-2xl border border-ui-border-base bg-ui-bg-subtle/30 text-center">
            <p className="text-ui-fg-subtle">No products in this category.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default StoreTemplate
