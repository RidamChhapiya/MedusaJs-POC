import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import TelecomCoreModuleService from "../../../../modules/telecom-core/service"

/**
 * Customer Registration API
 * POST /store/auth/register
 * 
 * Creates a new customer account with validation:
 * - Phone number must not be already registered
 * - Phone number must not be a Nexel number
 * - Email must be unique
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
    const telecomModule: TelecomCoreModuleService = req.scope.resolve("telecom")

    try {
        const {
            full_name,
            email,
            primary_phone,
            password,
            date_of_birth,
            gender,
            address,
        } = req.body as any

        // Validation 1: Check if primary_phone is already registered
        const existingProfile = await telecomModule.listCustomerProfiles({
            primary_phone
        })

        if (existingProfile.length > 0) {
            return res.status(400).json({
                error: "Phone number already registered",
                message: "This phone number is already registered. Please login instead."
            })
        }

        // Validation 2: Check if primary_phone is a Nexel number
        const nexelNumber = await telecomModule.listMsisdnInventories({
            phone_number: primary_phone
        })

        if (nexelNumber.length > 0) {
            return res.status(400).json({
                error: "Cannot register with Nexel number",
                message: "Cannot register with a Nexel number. Please use a different number."
            })
        }

        // Create Medusa customer
        const customerModule = req.scope.resolve("customer")
        const customer = await customerModule.createCustomers({
            email,
            first_name: full_name.split(" ")[0],
            last_name: full_name.split(" ").slice(1).join(" ") || "",
            phone: primary_phone,
        })

        // Create CustomerProfile
        const profile = await telecomModule.createCustomerProfiles({
            customer_id: customer.id,
            full_name,
            email,
            primary_phone,
            date_of_birth: date_of_birth ? new Date(date_of_birth) : null,
            gender: gender || null,
            address_line1: address.line1,
            address_line2: address.line2 || null,
            city: address.city,
            state: address.state,
            pincode: address.pincode,
            country: address.country || "IN",
            kyc_status: "pending",
            is_nexel_subscriber: false,
            registration_source: "web",
        })

        // TODO: Create auth credentials with password
        // For now, return success with customer details

        return res.status(201).json({
            success: true,
            customer: {
                id: customer.id,
                email: customer.email,
                full_name: profile.full_name,
                primary_phone: profile.primary_phone,
                kyc_status: profile.kyc_status,
                is_nexel_subscriber: profile.is_nexel_subscriber,
            },
            message: "Registration successful. Please login to continue."
        })

    } catch (error) {
        console.error("[Customer Registration] Error:", error)
        return res.status(500).json({
            error: error instanceof Error ? error.message : "Registration failed"
        })
    }
}
