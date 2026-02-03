"use server"

import { cache } from "react"
import { sdk } from "@lib/config"
import { sortProducts } from "@lib/util/sort-products"
import { HttpTypes } from "@medusajs/types"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import { getAuthHeaders, getCacheOptions } from "./cookies"
import { getRegion, retrieveRegion } from "./regions"

/**
 * Request-deduplicated fetch for a single product by handle.
 * Use from product page and generateMetadata to avoid fetching the same product twice.
 */
export const getProductByHandle = cache(
  async (
    countryCode: string,
    handle: string
  ): Promise<{
    region: HttpTypes.StoreRegion | null
    product: HttpTypes.StoreProduct | null
  }> => {
    const [region, productResult] = await Promise.all([
      getRegion(countryCode),
      listProducts({
        countryCode,
        queryParams: { handle },
      }),
    ])
    const product = productResult.response.products[0] ?? null
    return { region, product }
  }
)

export const listProducts = async ({
  pageParam = 1,
  queryParams,
  countryCode,
  regionId,
}: {
  pageParam?: number
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductListParams
  countryCode?: string
  regionId?: string
}): Promise<{
  response: { products: HttpTypes.StoreProduct[]; count: number }
  nextPage: number | null
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductListParams
}> => {
  if (!countryCode && !regionId) {
    throw new Error("Country code or region ID is required")
  }

  const limit = queryParams?.limit || 12
  const _pageParam = Math.max(pageParam, 1)
  const offset = _pageParam === 1 ? 0 : (_pageParam - 1) * limit

  // Map country codes to Sales Channel IDs (use lowercase for comparison)
  // This ensures we only fetch products available in the specific region's sales channel
  let salesChannelId: string | undefined
  const code = countryCode?.toLowerCase()

  if (code === "fr") {
    salesChannelId = process.env.NEXT_PUBLIC_SC_ID_FR?.trim()
  } else {
    // Default to India for 'in' or any other region/fallback
    salesChannelId = process.env.NEXT_PUBLIC_SC_ID_IN?.trim()
  }

  // Ensure we ALWAYS send a sales_channel_id to avoid ambiguous inventory errors
  // since our API Key is now associated with multiple channels.
  const salesChannelQuery = salesChannelId ? { sales_channel_id: [salesChannelId] } : {}

  let region: HttpTypes.StoreRegion | undefined | null

  if (countryCode) {
    region = await getRegion(countryCode)
  } else {
    region = await retrieveRegion(regionId!)
  }

  if (!region) {
    return {
      response: { products: [], count: 0 },
      nextPage: null,
    }
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("products")),
    tags: ["products"], // Add cache tag for revalidation
    // Revalidate every 30 seconds - balances freshness with performance
    // This means: cache for 30 seconds, then fetch fresh data on next request
    revalidate: 30,
  }

  return sdk.client
    .fetch<{ products: HttpTypes.StoreProduct[]; count: number }>(
      `/store/products`,
      {
        method: "GET",
        query: {
          limit,
          offset,
          region_id: region?.id,
          // Omit +variants.inventory_quantity to avoid "Inventory availability cannot be calculated"
          // when publishable key has no single sales channel. Add it back once the key has one sales channel in Admin.
          fields:
            "*variants.calculated_price,*variants.images,+metadata,+tags,*categories",
          ...queryParams,
          ...salesChannelQuery,
        },
        headers,
        next,
        // Using revalidate: 30 means cache for 30 seconds, then refresh
        // This is better than "no-store" (always fetch) or "force-cache" (never refresh)
        cache: "force-cache", // Cache the response, but revalidate based on 'revalidate' setting above
      }
    )
    .then(({ products, count }) => {
      const nextPage = count > offset + limit ? pageParam + 1 : null

      return {
        response: {
          products,
          count,
        },
        nextPage: nextPage,
        queryParams,
      }
    })
}

/**
 * This will fetch products to the Next.js cache, optionally filter by search query,
 * sort by sortBy, and return paginated results.
 */
export const listProductsWithSort = async ({
  page = 0,
  queryParams,
  sortBy = "created_at",
  countryCode,
  q,
}: {
  page?: number
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductParams
  sortBy?: SortOptions
  countryCode: string
  /** Optional search query: filter by title or handle (case-insensitive) */
  q?: string
}): Promise<{
  response: { products: HttpTypes.StoreProduct[]; count: number }
  nextPage: number | null
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductParams
}> => {
  const limit = queryParams?.limit || 12
  const fetchLimit = q ? 200 : 100

  const {
    response: { products: rawProducts, count: rawCount },
  } = await listProducts({
    pageParam: 0,
    queryParams: {
      ...queryParams,
      limit: fetchLimit,
    },
    countryCode,
  })

  let products = rawProducts
  if (q && q.trim()) {
    const term = q.trim().toLowerCase()
    products = rawProducts.filter(
      (p) =>
        (p.title && p.title.toLowerCase().includes(term)) ||
        (p.handle && p.handle.toLowerCase().includes(term)) ||
        (p.description && p.description.toLowerCase().includes(term))
    )
  }
  const count = products.length

  const sortedProducts = sortProducts(products, sortBy)

  const pageParam = (page - 1) * limit

  const nextPage = count > pageParam + limit ? pageParam + limit : null

  const paginatedProducts = sortedProducts.slice(pageParam, pageParam + limit)

  return {
    response: {
      products: paginatedProducts,
      count,
    },
    nextPage,
    queryParams,
  }
}
