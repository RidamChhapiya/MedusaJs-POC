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
    /** Data left in MB (for "X GB left" display) */
    data_left_mb?: number
    /** This month total spent (in paise/cents) */
    spending_this_month?: number
    /** Last month total spent (in paise/cents) */
    spending_last_month?: number
    /** Last 6 months spending: { month: "YYYY-MM", amount } */
    spending_by_month?: { month: string; amount: number }[]
    /** Current plans with balance details (from dashboard) */
    current_plans?: Array<{
        msisdn: string
        plan_name: string
        end_date: string
        days_remaining: number
        data_balance: { remaining_mb: number; total_mb: number; percentage: number }
        voice_balance: { remaining_min: number; total_min: number; is_unlimited: boolean }
    }>
    recharge_history?: Array<{ date: string; amount: number; plan_name: string }>
}

export interface UsageAnalytics {
    date: string
    data_usage: number
    voice_usage: number
    sms_usage: number
}

export interface Subscription {
    id: string
    msisdn?: string
    plan: Plan
    start_date: string
    end_date: string
    status: "active" | "expired" | "pending" | "suspended" | "cancelled"
    /** Data balance remaining (MB) */
    data_balance_mb?: number
    /** Voice balance remaining (minutes) */
    voice_balance_min?: number
    /** Plan data quota (MB) */
    data_quota_mb?: number
    /** Plan voice quota (minutes); 999999 = unlimited */
    voice_quota_min?: number
    /** Plan validity in days */
    validity_days?: number
    auto_renew?: boolean
    can_suspend?: boolean
    can_resume?: boolean
    can_cancel?: boolean
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
    /** When paying with Stripe (card), set after confirmCardPayment succeeds */
    payment_collection_id?: string
    payment_session_id?: string
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
    /** When paying with Stripe (card), set after confirmCardPayment succeeds */
    payment_collection_id?: string
    payment_session_id?: string
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
