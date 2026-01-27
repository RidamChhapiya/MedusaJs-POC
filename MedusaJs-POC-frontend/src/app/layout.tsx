import { getBaseURL } from "@lib/util/env"
import { Metadata } from "next"
import { ThemeProvider } from "@lib/context/theme-context"
import QueryProvider from "@lib/context/query-provider"
import "styles/globals.css"

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
}

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const stored = localStorage.getItem('medusa-theme');
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                const theme = stored || (prefersDark ? 'dark' : 'light');
                const bgColor = theme === 'dark' ? '#1F2937' : '#FFFFFF';
                
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                }
                
                // Set background immediately to prevent flash
                document.body.style.backgroundColor = bgColor;
                const main = document.querySelector('main');
                if (main) {
                  main.style.backgroundColor = bgColor;
                }
                
                // Also set for any page containers that might render
                const style = document.createElement('style');
                style.textContent = 'body, main { background-color: ' + bgColor + ' !important; transition: none !important; } [data-testid="cart-container"], [data-testid="category-container"] { background-color: ' + bgColor + ' !important; transition: none !important; }';
                document.head.appendChild(style);
              })();
            `,
          }}
        />
      </head>
      <body className="bg-white dark:bg-grey-80 text-grey-90 dark:text-grey-10">
        <QueryProvider>
          <ThemeProvider>
            <main className="relative bg-white dark:bg-grey-80 min-h-screen">{props.children}</main>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
