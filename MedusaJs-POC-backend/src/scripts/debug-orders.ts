
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export default async function debugOrders({ container }: ExecArgs) {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    const customerId = "cus_01KEEGNQ7TG4GRNEZFY9BM69E7"

    logger.info(`Checking orders for customer: ${customerId}`)

    try {
        const { data: orders } = await query.graph({
            entity: "order",
            fields: ["id", "email", "customer_id"],
            filters: {
                customer_id: customerId
            }
        })

        logger.info(`Found ${orders.length} orders for this customer.`)
        if (orders.length > 0) {
            console.log(JSON.stringify(orders, null, 2))
        } else {
            // Check if any orders exist at all
            const { data: allOrders } = await query.graph({
                entity: "order",
                fields: ["id", "email", "customer_id"],
                pagination: { limit: 5 }
            })
            logger.info(`First 5 orders in system:`)
            console.log(JSON.stringify(allOrders, null, 2))
        }
    } catch (error) {
        logger.error("Error querying orders:", error)
    }
}
