import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import TelecomCoreModuleService from "../../../../modules/telecom-core/service"

/**
 * Customer Login API
 * POST /store/auth/login
 * 
 * Authenticates customer with phone number and password
 * Supports both Nexel and non-Nexel phone numbers
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
    const telecomModule: TelecomCoreModuleService = req.scope.resolve("telecom")

    try {
        const { phone_number, password } = req.body as any

        if (!phone_number || !password) {
            return res.status(400).json({
                error: "Missing credentials",
                message: "Phone number and password are required"
            })
        }

        let customerProfile = null

        // Check if phone_number is a Nexel number
        const nexelNumber = await telecomModule.listMsisdnInventories({
            phone_number,
            status: "active" // Only active Nexel numbers can login
        })

        if (nexelNumber.length > 0 && nexelNumber[0].customer_id) {
            // Login with Nexel number
            const profiles = await telecomModule.listCustomerProfiles({
                customer_id: nexelNumber[0].customer_id
            })
            customerProfile = profiles[0]
        } else {
            // Login with non-Nexel number (primary_phone)
            const profiles = await telecomModule.listCustomerProfiles({
                primary_phone: phone_number
            })
            customerProfile = profiles[0]
        }

        if (!customerProfile) {
            return res.status(401).json({
                error: "Invalid credentials",
                message: "Phone number not registered. Please sign up first."
            })
        }

        // TODO: Verify password with auth module
        // For POC, we'll skip password verification

        // Get customer details
        const customerModule = req.scope.resolve("customer")
        const [customer] = await customerModule.listCustomers({
            id: customerProfile.customer_id
        })

        // TODO: Create session token
        // For POC, return customer data directly

        return res.status(200).json({
            success: true,
            customer: {
                id: customer.id,
                email: customer.email,
                full_name: customerProfile.full_name,
                primary_phone: customerProfile.primary_phone,
                is_nexel_subscriber: customerProfile.is_nexel_subscriber,
                nexel_numbers: customerProfile.nexel_numbers || [],
                kyc_status: customerProfile.kyc_status,
            },
            message: "Login successful"
        })

    } catch (error) {
        console.error("[Customer Login] Error:", error)
        return res.status(500).json({
            error: error instanceof Error ? error.message : "Login failed"
        })
    }
}
