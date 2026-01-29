"use client"

import { useEffect, useRef } from "react"
import useToggleState from "@lib/hooks/use-toggle-state"
import CountrySelect from "../country-select"
import { HttpTypes } from "@medusajs/types"

type NavCountrySelectProps = {
  regions: HttpTypes.StoreRegion[] | null
}

export default function NavCountrySelect({ regions }: NavCountrySelectProps) {
  const toggleState = useToggleState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        toggleState.close()
      }
    }
    if (toggleState.state) {
      document.addEventListener("click", handleClickOutside)
    }
    return () => document.removeEventListener("click", handleClickOutside)
  }, [toggleState.state])

  if (!regions?.length) return null

  return (
    <div
      ref={containerRef}
      className="flex items-center h-full cursor-pointer hover:text-ui-fg-base dark:hover:text-grey-10 text-grey-70 dark:text-grey-30"
      onClick={(e) => {
        e.stopPropagation()
        toggleState.open()
      }}
    >
      <CountrySelect toggleState={toggleState} regions={regions} dropdownBelow />
    </div>
  )
}
