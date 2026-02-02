"use client"

import { useEffect, useState } from "react"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import NavCountrySelect from "@modules/layout/components/nav-country-select"
import ThemeToggle from "@modules/common/components/theme-toggle"
import { usePathname } from "next/navigation"

type Locale = {
    code: string
    name: string
}

type ClientNavProps = {
    regions: HttpTypes.StoreRegion[]
    locales: Locale[] | null
    currentLocale: string | null
    cartButton: React.ReactNode
}

export default function ClientNav({
    regions,
    cartButton,
}: ClientNavProps) {
    const [isScrolled, setIsScrolled] = useState(false)
    const pathname = usePathname()

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 0) {
                setIsScrolled(true)
            } else {
                setIsScrolled(false)
            }
        }

        if (typeof window !== 'undefined') {
            if (window.scrollY > 0) setIsScrolled(true)
            window.addEventListener("scroll", handleScroll)
            return () => window.removeEventListener("scroll", handleScroll)
        }
    }, [])

    // Futuristic link styling: Pill effect on hover
    const linkClasses =
        "relative px-4 py-2 rounded-full transition-all duration-300 ease-out text-grey-70 dark:text-grey-40 font-medium hover:text-ui-fg-base dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 hover:shadow-[0_0_15px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:scale-105 whitespace-nowrap"

    return (
        <div className="sticky top-0 inset-x-0 z-50 group">
            <header
                className={`relative h-20 w-full mx-auto transition-all duration-300 ease-in-out border-b
          backdrop-blur-xl
          ${isScrolled
                        ? "bg-white/80 dark:bg-black/80 border-ui-border-base dark:border-grey-80 shadow-md"
                        : "bg-white/60 dark:bg-black/60 border-transparent shadow-sm"
                    }
        `}
            >
                <nav className="content-container txt-xsmall-plus text-ui-fg-subtle dark:text-grey-30 flex items-center justify-between w-full h-full text-small-regular">

                    {/* Left Side: Country Select */}
                    <div className="flex-1 basis-0 h-full flex items-center gap-x-6">
                        <div className="hidden small:flex items-center h-full">
                            <NavCountrySelect regions={regions} />
                        </div>
                    </div>

                    {/* Center: Logo & Main Links */}
                    <div className="flex items-center h-full gap-x-8">
                        <LocalizedClientLink
                            href="/"
                            className="txt-compact-xlarge-plus text-ui-fg-base dark:text-white uppercase transition-transform duration-300 hover:scale-105 tracking-widest font-bold whitespace-nowrap"
                            data-testid="nav-store-link"
                        >
                            Medusa Telecom
                        </LocalizedClientLink>

                        <div className="hidden small:flex items-center gap-x-6 h-full">
                            <LocalizedClientLink className={linkClasses} href="/buy-sim">
                                GET CONNECTED
                            </LocalizedClientLink>
                            <LocalizedClientLink className={linkClasses} href="/recharge">
                                INSTANT RECHARGE
                            </LocalizedClientLink>
                            <LocalizedClientLink className={linkClasses} href="/store">
                                GEAR
                            </LocalizedClientLink>
                            <LocalizedClientLink className={linkClasses} href="/business">
                                BUSINESS
                            </LocalizedClientLink>
                        </div>
                    </div>

                    {/* Right Side: Account, Theme, Cart */}
                    <div className="flex items-center gap-x-6 h-full flex-1 basis-0 justify-end">
                        <div className="hidden small:flex items-center gap-x-6 h-full">
                            <LocalizedClientLink
                                className={linkClasses}
                                href="/account"
                                data-testid="nav-my-hub-link"
                            >
                                MY HUB
                            </LocalizedClientLink>
                            <LocalizedClientLink
                                className={linkClasses}
                                href="/my-numbers"
                                data-testid="nav-my-numbers-link"
                            >
                                MY NUMBERS
                            </LocalizedClientLink>
                        </div>
                        <ThemeToggle />
                        {cartButton}
                    </div>
                </nav>
            </header>
        </div>
    )
}
