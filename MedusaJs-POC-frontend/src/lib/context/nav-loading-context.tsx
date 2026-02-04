"use client"

import { usePathname, useSearchParams } from "next/navigation"
import React, { createContext, useContext, useEffect, useState } from "react"

interface NavLoadingContextType {
    loading: boolean
    startLoading: () => void
    stopLoading: () => void
}

const NavLoadingContext = createContext<NavLoadingContextType | null>(null)

const FALLBACK_VALUE: NavLoadingContextType = {
    loading: false,
    startLoading: () => {},
    stopLoading: () => {},
}

export const useNavLoading = () => {
    const context = useContext(NavLoadingContext)
    if (!context) {
        throw new Error("useNavLoading must be used within a NavLoadingProvider")
    }
    return context
}

/** Use in Suspense fallback so children (e.g. 404) can call useNavLoading without the real provider (which uses useSearchParams). */
export const FallbackNavLoadingProvider = ({ children }: { children: React.ReactNode }) => (
    <NavLoadingContext.Provider value={FALLBACK_VALUE}>{children}</NavLoadingContext.Provider>
)

export const NavLoadingProvider = ({ children }: { children: React.ReactNode }) => {
    const [loading, setLoading] = useState(false)
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const startLoading = () => setLoading(true)
    const stopLoading = () => setLoading(false)

    // Reset loading state on route change
    useEffect(() => {
        stopLoading()
    }, [pathname, searchParams])

    return (
        <NavLoadingContext.Provider value={{ loading, startLoading, stopLoading }}>
            {children}
        </NavLoadingContext.Provider>
    )
}
