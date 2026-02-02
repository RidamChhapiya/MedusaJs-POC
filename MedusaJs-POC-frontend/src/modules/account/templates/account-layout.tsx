import React from "react"

import UnderlineLink from "@modules/common/components/interactive-link"

import AccountNav from "../components/account-nav"
import { HttpTypes } from "@medusajs/types"

interface AccountLayoutProps {
  customer: HttpTypes.StoreCustomer | null
  children: React.ReactNode
}

const AccountLayout: React.FC<AccountLayoutProps> = ({
  customer,
  children,
}) => {
  return (
    <div className="flex-1 small:py-12" data-testid="account-page">
      <div className="flex-1 content-container h-full max-w-5xl mx-auto bg-white dark:bg-grey-80 flex flex-col">
        <div className="grid grid-cols-1  small:grid-cols-[240px_1fr] py-12">
          <div>{customer && <AccountNav customer={customer} />}</div>
          <div className="flex-1">{children}</div>
        </div>
        <div className="small:border-t border-gray-200 dark:border-grey-70 py-12">
          <h3 className="text-xl-semi mb-4 text-grey-90 dark:text-grey-10">Got questions?</h3>
          <span className="txt-medium text-grey-70 dark:text-grey-30">
            You can find frequently asked questions and answers on our{" "}
            <UnderlineLink href="/customer-service">customer service page</UnderlineLink>.
          </span>
        </div>
      </div>
    </div>
  )
}

export default AccountLayout
