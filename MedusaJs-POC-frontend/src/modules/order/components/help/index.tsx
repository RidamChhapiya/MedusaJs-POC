import { Heading } from "@medusajs/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import React from "react"

const Help = () => {
  return (
    <div className="rounded-xl border border-ui-border-base bg-ui-bg-subtle/50 p-5">
      <Heading level="h3" className="text-base font-semibold text-ui-fg-base mb-2">
        Need help?
      </Heading>
      <div className="text-sm text-ui-fg-subtle">
        <ul className="gap-y-1.5 flex flex-col">
          <li>
            <LocalizedClientLink href="/customer-service" className="text-ui-fg-interactive hover:underline">
              Customer service & FAQ
            </LocalizedClientLink>
          </li>
          <li>
            <LocalizedClientLink href="/customer-service" className="text-ui-fg-interactive hover:underline">
              Returns & exchanges
            </LocalizedClientLink>
          </li>
        </ul>
      </div>
    </div>
  )
}

export default Help
