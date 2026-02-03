# Frontend Performance Optimization Guide

## Why It Feels Slow (2–4 seconds for product page / add to cart)

### 1. **Request waterfalls (sequential instead of parallel)**

- **Product page:** `getRegion()` runs first, then `listProducts()` runs. Each backend round-trip adds latency (e.g. 200–600 ms). Doing them one after the other doubles the wait.
- **Layout (every page):** `retrieveCustomer()` → then `retrieveCart()` → then **if cart** `listCartOptions()`. Three calls in sequence, so 3× round-trip time before the page can render.
- **Add to cart:** `getOrSetCart()` does `getRegion()` → `retrieveCart()` → sometimes `cart.create()`, then `createLineItem()`. So 3–4 sequential round-trips (e.g. 4 × 400 ms ≈ 1.6 s just in network).

### 2. **Duplicate fetches for the same data**

- **Product page** fetches the **same product 3 times**:
  1. `generateMetadata()` → `listProducts({ handle })`
  2. `ProductPage` → `listProducts({ handle })` again
  3. `ProductActionsWrapper` → `listProducts({ id: [id] })` again (for “real-time” pricing)
- **Region** is fetched multiple times: in metadata, in page, inside `listProducts()` (which calls `getRegion()`), and in `RelatedProducts` again.

### 3. **Heavy layout on every navigation**

- **Layout** (`(main)/layout.tsx`) runs on every request and does:
  - `retrieveCustomer()` (with `*orders`)
  - `retrieveCart()` with a **very large** `fields` string:  
    `*items, *region, *items.product, *items.variant, *items.thumbnail, *items.metadata, +items.total, *promotions, +shipping_methods.name`
  - If cart exists: `listCartOptions()` (shipping options)
- So every click (product, store, cart) waits for customer + full cart + shipping options before showing the page.

### 4. **Heavy product API usage**

- `listProducts` requests many fields:  
  `*variants.calculated_price,+variants.inventory_quantity,*variants.images,+metadata,+tags,*categories`
- Backend has to compute pricing, load relations, etc. Bigger payload and more work = slower response.

### 5. **No parallelization where it’s possible**

- Layout could run `retrieveCustomer()` and `retrieveCart()` in parallel with `Promise.all()`.
- Product page could run `getRegion()` and `listProducts()` in parallel.
- Add-to-cart could get region and cart in parallel when you already have a cart id.

---

## Recommended Optimizations (in order of impact)

### High impact

1. **Run layout data in parallel**  
   - **File:** `src/app/[countryCode]/(main)/layout.tsx`  
   - **Change:**  
     - `const [customer, cart] = await Promise.all([retrieveCustomer(), retrieveCart()])`  
     - Then, if cart: `listCartOptions()` (or run it in parallel too with a small wrapper so it’s only called when cart id exists).  
   - **Effect:** Cuts layout time from 3× round-trip to ~1× (or 2× if you keep shipping options).

2. **Stop fetching the same product 3 times on the product page**  
   - **Files:**  
     - `src/app/[countryCode]/(main)/products/[handle]/page.tsx`  
     - `src/modules/products/templates/product-actions-wrapper/index.tsx`  
   - **Change:**  
     - Fetch product **once** in the page (with the fields you need for both metadata and body).  
     - Pass that product into the template and into `ProductActionsWrapper` (or a wrapper that only needs pricing from the same product).  
     - Remove the extra `listProducts` call from `ProductActionsWrapper` for the same product; use the page’s product (or a single shared fetch).  
   - **Effect:** 2 fewer product API calls per product view.

3. **Parallelize product page data**  
   - **File:** `src/app/[countryCode]/(main)/products/[handle]/page.tsx`  
   - **Change:**  
     - `const [region, product] = await Promise.all([getRegion(params.countryCode), listProducts(...).then(...)])`  
     - Use the same product for metadata (or derive metadata from the same fetch).  
   - **Effect:** Product page waits for one “wave” of requests instead of region then product.

4. **Add-to-cart: avoid extra round-trips when possible**  
   - **File:** `src/lib/data/cart.ts` (e.g. `getOrSetCart` and `addToCart`)  
   - **Idea:**  
     - If you already have a cart id (e.g. from cookie), you could pass it in and only call `retrieveCart(cartId)` with minimal fields to check `completed_at`, then `createLineItem`, instead of always calling `getRegion` first.  
     - Or run `getRegion` and `retrieveCart` in parallel in `getOrSetCart`.  
   - **Effect:** Fewer sequential round-trips on add-to-cart.

### Medium impact

5. **Lighter cart fetch in layout**  
   - **File:** `src/lib/data/cart.ts` (`retrieveCart`)  
   - **Change:** For layout (e.g. when used from layout), use a smaller `fields` string: e.g. `id,items.*,subtotal,currency_code,region_id` and only request full cart (current big `fields`) on cart page / checkout.  
   - **Effect:** Faster and smaller cart response on every navigation.

6. **Lighter customer fetch in layout**  
   - **File:** `src/lib/data/customer.ts`  
   - **Change:** For layout you often only need “is there a customer?” or id/email. Use a smaller `fields` (e.g. `id,email`) and drop `*orders` when used from layout.  
   - **Effect:** Faster customer check on every page.

7. **Request only needed product fields**  
   - **File:** `src/lib/data/products.ts`  
   - **Change:** For product page, consider a slimmer `fields` (e.g. no `*categories` or fewer variant fields) when you only need title, handle, images, variants, price. Keep full fields for listing/search if needed.  
   - **Effect:** Faster and smaller product API response.

### Lower impact / polish

8. **Cache region aggressively**  
   - **File:** `src/lib/data/regions.ts`  
   - You already have an in-memory `regionMap`; ensure `listRegions` uses Next.js cache (`getCacheOptions`, `cache: "force-cache"`) so repeated `getRegion` calls don’t hit the backend every time.

9. **Streaming and Suspense**  
   - You already use `Suspense` for `ProductActionsWrapper` and `RelatedProducts`.  
   - Ensure the main product content doesn’t wait on related products; keep that pattern so the above-the-fold product loads first.

10. **Backend**  
   - If the Medusa backend is on the same machine, 2–4 s is mostly many round-trips, not a single slow endpoint.  
   - If backend is remote, consider keeping it close (same region/VPC) and enabling HTTP/2.  
   - Use Redis (you already have it) so cart/checkout locking and caching are fast.

---

## Summary

| Cause                          | Fix                                      | Expected effect      |
|--------------------------------|------------------------------------------|----------------------|
| Layout: 3 sequential requests  | `Promise.all([customer, cart])`         | ~⅔ less layout time  |
| Same product fetched 3×         | Fetch once, pass down                    | 2 fewer API calls    |
| Product page: region then product | `Promise.all([region, product])`       | ~½ product page time |
| Add to cart: 3–4 round-trips   | Parallelize getRegion + retrieveCart    | Shorter add-to-cart  |
| Very heavy cart/customer fields | Lighter fields in layout                 | Faster layout        |

Implementing the high-impact items should bring typical product page and add-to-cart flows from 2–4 s down to well under 1–2 s, with no backend changes. If you want, the next step is to apply these changes in the codebase step by step.
