import { SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
// import TelecomCoreModuleService from "@modules/telecom-core/service" // Cannot import directly in subscriber sometimes, need resolution

export default async function createCustomerProfile({
    event: { data },
    container,
}: {
    event: { data: { id: string } }
    container: any
}) {
    console.log(`[Subscriber] Handling customer.created for ID: ${data.id}`)

    const telecomModule = container.resolve("telecom")
    const customerModule = container.resolve(Modules.CUSTOMER)

    try {
        // 1. Fetch full customer details
        const customer = await customerModule.retrieveCustomer(data.id)
        console.log(`[Subscriber] Customer details:`, JSON.stringify(customer, null, 2))

        // 2. Map data to CustomerProfile
        // Note: Registration might send phone in metadata or root phone field.
        // We check both.
        const primaryPhone = customer.phone || (customer.metadata?.phone as string) || "N/A"

        // Construct full name if not explicit
        const fullName = (customer.first_name && customer.last_name)
            ? `${customer.first_name} ${customer.last_name}`
            : (customer.first_name || customer.email)

        // 3. Create Profile
        await telecomModule.createCustomerProfiles({
            customer_id: customer.id,
            email: customer.email,
            primary_phone: primaryPhone,
            full_name: fullName,
            // Optional defaults - use empty strings to satisfy NOT NULL db constraint if schema sync is pending
            address_line1: "",
            city: "",
            state: "",
            pincode: "",
            kyc_status: "pending",
            is_nexel_subscriber: false
        })

        console.log(`[Subscriber] Successfully created Telecom Profile for ${customer.email}`)

    } catch (error) {
        console.error(`[Subscriber] Failed to create Telecom Profile for ${data.id}:`, error)
    }
}

export const config: SubscriberConfig = {
    event: "customer.created",
}
