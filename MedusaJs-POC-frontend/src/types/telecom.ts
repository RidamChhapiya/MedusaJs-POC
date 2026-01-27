export interface AvailableNumber {
    msisdn: string
    region: string
    tier: string
    price: number
}

export interface Plan {
    id: string
    name: string
    price: number
    data_limit: number
    voice_limit: number // minutes
    sms_limit: number
    duration: number // days
    type: "prepaid" | "postpaid"
}

export interface CustomerDashboard {
    balance: number
    data_left: number
    voice_left: number
    sms_left: number
    currency_code: string
}

export interface UsageAnalytics {
    date: string
    data_usage: number
    voice_usage: number
    sms_usage: number
}

export interface Subscription {
    id: string
    plan: Plan
    start_date: string
    end_date: string
    status: "active" | "expired"
}

export interface KycStatus {
    customer_id: string
    kyc_status: "pending" | "verified" | "rejected" | "none"
    kyc_type?: string | null
    kyc_verified_at?: string | null
    document_url?: string
}

export interface PurchaseSimPayload {
    msisdn?: string // deprecated, keeping for compat if needed, prefer preferred_number as per request
    preferred_number: string
    plan_id: string
    customer_id: string
    sim_password?: string
    payment_method?: string
    shipping_address?: string
    shipping_city?: string
    shipping_state?: string
    shipping_pincode?: string
    shipping_landmark?: string
}

export interface RechargePayload {
    nexel_number: string
    plan_id: string
    payment_method?: string
    recharge_for_self?: boolean
}

export interface LoginPayload {
    phone_number: string
    otp?: string // If implicit OTP flow
}

export interface RegisterPayload {
    email: string
    first_name: string
    last_name: string
    phone_number: string
    dob: string
    gender: "male" | "female" | "other"
    password?: string
}
