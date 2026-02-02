"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"

import SortProducts, { SortOptions } from "./sort-products"

type RefinementListProps = {
  sortBy: SortOptions
  searchQuery?: string
  "data-testid"?: string
}

const RefinementList = ({
  sortBy,
  searchQuery,
  "data-testid": dataTestId,
}: RefinementListProps) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const createQueryString = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams)
      Object.entries(updates).forEach(([name, value]) => {
        if (value !== undefined && value !== "") params.set(name, value)
        else params.delete(name)
      })
      return params.toString()
    },
    [searchParams]
  )

  const setQueryParams = (name: string, value: string) => {
    const query = createQueryString({ [name]: value })
    router.push(`${pathname}?${query}`)
  }

  const clearSearch = useCallback(() => {
    const params = new URLSearchParams(searchParams)
    params.delete("q")
    params.set("page", "1")
    router.push(`${pathname}?${params.toString()}`)
  }, [pathname, searchParams, router])

  return (
    <aside className="flex small:flex-col gap-6 py-4 small:py-0 small:pr-8 small:min-w-[260px] small:border-r small:border-ui-border-base small:mr-8">
      {searchQuery?.trim() && (
        <div className="rounded-xl border border-ui-border-base bg-ui-bg-subtle/50 p-4">
          <p className="text-xs font-medium text-ui-fg-muted mb-2">Active search</p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-ui-fg-subtle truncate max-w-[160px]" title={searchQuery}>
              &ldquo;{searchQuery}&rdquo;
            </span>
            <button
              type="button"
              onClick={clearSearch}
              className="text-sm font-medium text-ui-fg-interactive hover:underline shrink-0"
            >
              Clear
            </button>
          </div>
        </div>
      )}
      <div className="rounded-xl border border-ui-border-base bg-ui-bg-subtle/50 p-4 small:p-5">
        <SortProducts sortBy={sortBy} setQueryParams={setQueryParams} data-testid={dataTestId} />
      </div>
    </aside>
  )
}

export default RefinementList
