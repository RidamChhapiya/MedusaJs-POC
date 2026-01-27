import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import TelecomCoreModuleService from "../../../../modules/telecom-core/service"

/**
 * Customer Profile Management
 * GET /store/customer/profile/:customer_id
 * PATCH /store/customer/profile/:customer_id
 */

export async function GET(
    req: MedusaRequest<{ customer_id: string }>,
    res: MedusaResponse
) {
    const telecomModule: TelecomCoreModuleService = req.scope.resolve("telecom")
    const { customer_id } = req.params

    try {
        const profiles = await telecomModule.listCustomerProfiles({
            customer_id
        })

        if (profiles.length === 0) {
            return res.status(404).json({
                error: "Profile not found"
            })
        }

        const profile = profiles[0]

        return res.json({
            profile: {
                full_name: profile.full_name,
                email: profile.email,
                primary_phone: profile.primary_phone,
                alternate_phone: profile.alternate_phone,
                date_of_birth: profile.date_of_birth,
                gender: profile.gender,
                address: {
                    line1: profile.address_line1,
                    line2: profile.address_line2,
                    city: profile.city,
                    state: profile.state,
                    pincode: profile.pincode,
                    country: profile.country
                },
                kyc_status: profile.kyc_status,
                is_nexel_subscriber: profile.is_nexel_subscriber,
                nexel_numbers: profile.nexel_numbers || [],
                notification_preferences: profile.notification_preferences || {},
                language_preference: profile.language_preference
            }
        })

    } catch (error) {
        console.error("[Get Profile] Error:", error)
        return res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to fetch profile"
        })
    }
}

export async function PATCH(
    req: MedusaRequest<{ customer_id: string }>,
    res: MedusaResponse
) {
    const telecomModule: TelecomCoreModuleService = req.scope.resolve("telecom")
    const { customer_id } = req.params

    try {
        const profiles = await telecomModule.listCustomerProfiles({
            customer_id
        })

        if (profiles.length === 0) {
            return res.status(404).json({
                error: "Profile not found"
            })
        }

        const profile = profiles[0]
        const updates = req.body as any

        // Build update object
        const updateData: any = {}

        if (updates.full_name) updateData.full_name = updates.full_name
        if (updates.alternate_phone) updateData.alternate_phone = updates.alternate_phone
        if (updates.date_of_birth) updateData.date_of_birth = new Date(updates.date_of_birth)
        if (updates.gender) updateData.gender = updates.gender

        if (updates.address) {
            if (updates.address.line1) updateData.address_line1 = updates.address.line1
            if (updates.address.line2) updateData.address_line2 = updates.address.line2
            if (updates.address.city) updateData.city = updates.address.city
            if (updates.address.state) updateData.state = updates.address.state
            if (updates.address.pincode) updateData.pincode = updates.address.pincode
            if (updates.address.country) updateData.country = updates.address.country
        }

        if (updates.notification_preferences) {
            updateData.notification_preferences = updates.notification_preferences
        }

        if (updates.language_preference) {
            updateData.language_preference = updates.language_preference
        }

        // Update profile
        await telecomModule.updateCustomerProfiles({
            id: profile.id,
            ...updateData
        })

        return res.json({
            success: true,
            message: "Profile updated successfully"
        })

    } catch (error) {
        console.error("[Update Profile] Error:", error)
        return res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to update profile"
        })
    }
}
