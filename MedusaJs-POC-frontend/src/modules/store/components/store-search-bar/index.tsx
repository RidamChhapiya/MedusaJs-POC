"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { Input } from "@medusajs/ui"

const DEBOUNCE_MS = 380

type StoreSearchBarProps = {
  searchQuery?: string
  activeType: "all" | "smartphones" | "accessories"
  sortBy?: string
}

export default function StoreSearchBar({
  searchQuery = "",
  activeType,
  sortBy = "created_at",
}: StoreSearchBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const [localValue, setLocalValue] = useState(searchQuery)

  useEffect(() => {
    setLocalValue(searchQuery ?? "")
  }, [searchQuery])

  const buildUrl = useCallback(
    (q: string, page = 1) => {
      const params = new URLSearchParams(searchParams)
      const trimmed = q.trim()
      if (trimmed) params.set("q", trimmed)
      else params.delete("q")
      params.set("page", String(page))
      if (activeType !== "all") params.set("type", activeType)
      if (sortBy && sortBy !== "created_at") params.set("sortBy", sortBy)
      return `${pathname}?${params.toString()}`
    },
    [pathname, searchParams, activeType, sortBy]
  )

  const applySearch = useCallback(
    (value: string) => {
      const url = buildUrl(value, 1)
      router.push(url)
    },
    [buildUrl, router]
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setLocalValue(value)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null
      applySearch(value)
    }, DEBOUNCE_MS)
  }

  const handleClear = () => {
    setLocalValue("")
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    const params = new URLSearchParams(searchParams)
    params.delete("q")
    params.set("page", "1")
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
    inputRef.current?.focus()
  }

  return (
    <div className="relative w-full max-w-xl">
      <div className="relative flex items-center">
        <span className="absolute left-3 text-ui-fg-muted pointer-events-none z-10" aria-hidden>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </span>
        <Input
          ref={inputRef}
          type="text"
          name="q"
          value={localValue}
          onChange={handleChange}
          placeholder="Search products…"
          className="w-full pl-10 pr-10 rounded-xl border-ui-border-base bg-ui-bg-subtle focus:bg-ui-bg-base transition-colors"
          aria-label="Search products (updates as you type)"
          autoComplete="off"
          role="searchbox"
        />
        {localValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-ui-fg-muted hover:text-ui-fg-base hover:bg-ui-bg-base-hover transition-colors"
            aria-label="Clear search"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      <p className="mt-1.5 text-xs text-ui-fg-muted">Results update as you type</p>
    </div>
  )
}
