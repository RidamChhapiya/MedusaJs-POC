"use client"

import { FallbackNavLoadingProvider } from "@lib/context/nav-loading-context"
import { LoadingBar } from "@modules/common/components/loading-bar"
import QueryProvider from "@lib/context/query-provider"
import { ThemeProvider } from "@lib/context/theme-context"

export default function LayoutFallback({ children }: { children: React.ReactNode }) {
  return (
    <FallbackNavLoadingProvider>
      <LoadingBar />
      <QueryProvider>
        <ThemeProvider>
          <main className="relative bg-white dark:bg-grey-80 min-h-screen">{children}</main>
        </ThemeProvider>
      </QueryProvider>
    </FallbackNavLoadingProvider>
  )
}
