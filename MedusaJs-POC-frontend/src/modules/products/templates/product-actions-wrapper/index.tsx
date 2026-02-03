import { listProducts } from "@lib/data/products"
import { HttpTypes } from "@medusajs/types"
import ProductActions from "@modules/products/components/product-actions"

/**
 * Renders product actions (add to cart, etc.). Uses product from parent when provided
 * to avoid duplicate fetch; otherwise fetches by id (e.g. when used elsewhere).
 */
export default async function ProductActionsWrapper({
  id,
  region,
  product: productProp,
}: {
  id: string
  region: HttpTypes.StoreRegion
  /** When provided, skips fetching the same product again */
  product?: HttpTypes.StoreProduct | null
}) {
  const product =
    productProp ??
    (await listProducts({
      queryParams: { id: [id] },
      regionId: region.id,
    }).then(({ response }) => response.products[0]))

  if (!product) {
    return null
  }

  return <ProductActions product={product} region={region} />
}
