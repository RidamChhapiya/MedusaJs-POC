"use client"

import { clx } from "@medusajs/ui"

export type SortOptions = "price_asc" | "price_desc" | "created_at"

type SortProductsProps = {
  sortBy: SortOptions
  setQueryParams: (name: string, value: SortOptions) => void
  "data-testid"?: string
}

const sortOptions: { value: SortOptions; label: string }[] = [
  { value: "created_at", label: "Latest" },
  { value: "price_asc", label: "Price: Low → High" },
  { value: "price_desc", label: "Price: High → Low" },
]

const SortProducts = ({
  "data-testid": dataTestId,
  sortBy,
  setQueryParams,
}: SortProductsProps) => {
  return (
    <div data-testid={dataTestId}>
      <p className="text-xs font-medium text-ui-fg-muted mb-3">Sort by</p>
      <div className="flex flex-wrap gap-2">
        {sortOptions.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setQueryParams("sortBy", opt.value)}
            className={clx(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border",
              sortBy === opt.value
                ? "bg-ui-bg-base text-ui-fg-base border-ui-border-base shadow-sm"
                : "bg-transparent text-ui-fg-subtle border-transparent hover:bg-ui-bg-subtle hover:text-ui-fg-base hover:border-ui-border-base"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default SortProducts
