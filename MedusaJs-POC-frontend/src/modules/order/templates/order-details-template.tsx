"use client"

import { XMark } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Help from "@modules/order/components/help"
import Items from "@modules/order/components/items"
import OrderDetails from "@modules/order/components/order-details"
import OrderStatusSection from "@modules/order/components/order-status-section"
import OrderSummary from "@modules/order/components/order-summary"
import ShippingDetails from "@modules/order/components/shipping-details"
import React from "react"

type OrderDetailsTemplateProps = {
  order: HttpTypes.StoreOrder
}

const OrderDetailsTemplate: React.FC<OrderDetailsTemplateProps> = ({ order }) => {
  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div className="flex gap-2 justify-between items-center">
        <h1 className="text-2xl font-bold text-ui-fg-base">Order #{order.display_id}</h1>
        <LocalizedClientLink
          href="/account/orders"
          className="flex gap-2 items-center text-sm text-ui-fg-subtle hover:text-ui-fg-base"
          data-testid="back-to-overview-button"
        >
          <XMark className="w-4 h-4" /> Back to orders
        </LocalizedClientLink>
      </div>

      <div className="flex flex-col gap-6" data-testid="order-details-container">
        <OrderDetails order={order} showStatus />

        <OrderStatusSection order={order} />

        <Items order={order} />

        <ShippingDetails order={order} />

        <OrderSummary order={order} />

        <Help />
      </div>
    </div>
  )
}

export default OrderDetailsTemplate
