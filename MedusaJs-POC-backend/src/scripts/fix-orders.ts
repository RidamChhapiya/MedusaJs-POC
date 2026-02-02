
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export default async function fixOrders({ container }: ExecArgs) {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    const query = container.resolve(ContainerRegistrationKeys.QUERY) // To read
    // To write, we usually use the Service. 
    // But Medusa V2 Modules are better accessed via workflows or specific services.
    // For quick fix, checking if I can use Order Module Service directly.

    const orderModule = container.resolve("order") // Module 'order'

    // Actually, updating order entities directly might be restricted.
    // We can try to use a workflow or just hack via Repository if available, 
    // but Medusa V2 encourages Service usage.
    // The 'order' module service has 'updateOrders'.

    const currentCustomerId = "cus_01KEEGNQ7TG4GRNEZFY9BM69E7"
    const targetEmail = "ridamchhapiya15@gmail.com"

    logger.info(`Finding orders for email: ${targetEmail}`)

    const { data: ordersToFix } = await query.graph({
        entity: "order",
        fields: ["id", "customer_id"],
        filters: {
            email: targetEmail,
            customer_id: { $ne: currentCustomerId }
        }
    })

    logger.info(`Found ${ordersToFix.length} orders to fix.`)

    if (ordersToFix.length > 0) {
        const updates = ordersToFix.map(o => ({
            id: o.id,
            customer_id: currentCustomerId
        }))

        logger.info("Updating orders...")
        // Using internal module service to update
        await orderModule.updateOrders(updates)
        logger.info("Orders updated successfully.")
    } else {
        logger.info("No orders needed fixing.")
    }
}
