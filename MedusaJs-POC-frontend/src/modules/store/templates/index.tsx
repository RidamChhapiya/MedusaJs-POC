import { Suspense } from "react"

import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import RefinementList from "@modules/store/components/refinement-list"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

import PaginatedProducts from "./paginated-products"

import { StoreProductCategory } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const StoreTemplate = ({
  sortBy,
  page,
  countryCode,
  categories,
  activeType
}: {
  sortBy?: SortOptions
  page?: string
  countryCode: string
  categories: {
    smartphones?: StoreProductCategory
    accessories?: StoreProductCategory
  }
  activeType: string
}) => {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"

  const activeCategoryId = activeType === "smartphones"
    ? categories.smartphones?.id
    : categories.accessories?.id

  return (
    <div
      className="flex flex-col small:flex-row small:items-start py-6 content-container bg-white dark:bg-grey-80 min-h-screen [transition:background-color_0s]"
      data-testid="category-container"
    >
      <RefinementList sortBy={sort} />
      <div className="w-full">
        <div className="mb-8 text-2xl-semi text-grey-90 dark:text-grey-10">
          <div className="flex flex-col gap-4">
            <h1 data-testid="store-page-title" className="text-3xl font-bold">Gear & Tech</h1>

            {/* Tabs */}
            <div className="flex border-b border-ui-border-base">
              <LocalizedClientLink
                href="/store?type=smartphones"
                className={`px-6 py-3 border-b-2 transition-colors font-medium text-base ${activeType === "smartphones" || !activeType
                    ? "border-ui-fg-base text-ui-fg-base"
                    : "border-transparent text-ui-fg-subtle hover:text-ui-fg-base"
                  }`}
              >
                Smartphones
              </LocalizedClientLink>
              <LocalizedClientLink
                href="/store?type=accessories"
                className={`px-6 py-3 border-b-2 transition-colors font-medium text-base ${activeType === "accessories"
                    ? "border-ui-fg-base text-ui-fg-base"
                    : "border-transparent text-ui-fg-subtle hover:text-ui-fg-base"
                  }`}
              >
                Accessories
              </LocalizedClientLink>
            </div>
          </div>
        </div>

        {activeCategoryId ? (
          <Suspense fallback={<SkeletonProductGrid />}>
            <PaginatedProducts
              sortBy={sort}
              page={pageNumber}
              countryCode={countryCode}
              categoryId={activeCategoryId}
            />
          </Suspense>
        ) : (
          <div className="py-12 flex justify-center text-ui-fg-subtle">
            <p>No products found in this category.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default StoreTemplate
