import { useQuery, useMutation } from "@tanstack/react-query"
import { telecomClient } from "../telecom-client"
import {
    AvailableNumber,
    Plan,
    CustomerDashboard,
    UsageAnalytics,
    Subscription,
    KycStatus,
    PurchaseSimPayload,
    RechargePayload
} from "../../types/telecom"

// Query Keys
const QUERY_KEYS = {
    AVAILABLE_NUMBERS: ["available_numbers"],
    PLANS: ["plans"],
    DASHBOARD: ["customer_dashboard"],
    USAGE: ["customer_usage"],
    SUBSCRIPTIONS: ["customer_subscriptions"],
    KYC_STATUS: ["kyc_status"],
}

// Hooks

export const useAvailableNumbers = (region?: string, offset: number = 0) => {
    return useQuery<AvailableNumber[]>({
        queryKey: [...QUERY_KEYS.AVAILABLE_NUMBERS, region, offset],
        queryFn: async () => {
            const queryParams = region ? `?region=${region}` : ""
            const offsetParam = offset > 0 ? `${region ? '&' : '?'}offset=${offset}` : ""
            const response = await telecomClient.get<{ available_numbers: any[] }>(`/store/telecom/purchase-sim/available-numbers${queryParams}${offsetParam}`)

            // Map backend response to frontend interface
            return response.available_numbers.map(num => ({
                msisdn: num.phone_number,
                region: num.region_code,
                tier: num.tier,
                price: 0 // Backend doesn't seem to return price for numbers yet, default to 0
            }))
        },
    })
}

export const usePlans = () => {
    return useQuery<Plan[]>({
        queryKey: QUERY_KEYS.PLANS,
        queryFn: async () => {
            const response = await telecomClient.get<{ plans: any[] }>("/store/telecom/purchase-sim")

            return response.plans.map(p => ({
                id: p.id,
                name: p.name,
                price: p.price,
                data_limit: Math.round((p.data_quota_mb || 0) / 1024), // Convert MB to GB
                voice_limit: p.voice_quota_min || 0,
                sms_limit: p.sms_quota || 0,
                duration: p.validity_days || 0,
                type: p.type
            }))
        },
    })
}

export const useCustomerDashboard = (customerId?: string) => {
    return useQuery<CustomerDashboard>({
        queryKey: [...QUERY_KEYS.DASHBOARD, customerId],
        queryFn: async () => {
            const response = await telecomClient.get<any>(
                `/store/customer/dashboard?customer_id=${encodeURIComponent(customerId ?? "")}`
            )

            let totalDataLeft = 0
            let totalVoiceLeft = 0
            if (response.current_plans && Array.isArray(response.current_plans)) {
                response.current_plans.forEach((plan: any) => {
                    totalDataLeft += plan.data_balance?.remaining_mb || 0
                    totalVoiceLeft += plan.voice_balance?.remaining_min || 0
                })
            }

            return {
                balance: 0,
                data_left: Math.round(totalDataLeft / 1024),
                data_left_mb: totalDataLeft,
                voice_left: totalVoiceLeft,
                sms_left: 100,
                currency_code: "inr",
                spending_this_month: response.analytics?.spending_this_month,
                spending_last_month: response.analytics?.spending_last_month,
                spending_by_month: response.analytics?.spending_by_month,
                current_plans: response.current_plans,
                recharge_history: response.recharge_history?.map((r: any) => ({
                    date: r.date,
                    amount: r.amount,
                    plan_name: r.plan_name
                }))
            }
        },
        enabled: !!customerId,
    })
}

export const useCustomerUsage = (customerId?: string) => {
    return useQuery<UsageAnalytics[]>({
        queryKey: [...QUERY_KEYS.USAGE, customerId],
        queryFn: () => telecomClient.get<UsageAnalytics[]>(`/store/customer/analytics/usage/${customerId}`),
        enabled: !!customerId,
    })
}

export const useCustomerSubscriptions = (customerId?: string) => {
    return useQuery<Subscription[]>({
        queryKey: [...QUERY_KEYS.SUBSCRIPTIONS, customerId],
        queryFn: async () => {
            const response = await telecomClient.get<{ subscriptions: any[] }>(`/store/customer/subscriptions/${customerId}`)

            return response.subscriptions.map((sub: any) => ({
                id: sub.id,
                msisdn: sub.msisdn,
                plan: {
                    id: "unknown",
                    name: sub.plan_name,
                    price: 0,
                    data_limit: sub.data_quota_mb != null ? Math.round(sub.data_quota_mb / 1024) : 0,
                    voice_limit: sub.voice_quota_min ?? 0,
                    sms_limit: 0,
                    duration: sub.validity_days ?? 30,
                    type: "prepaid"
                },
                start_date: sub.start_date,
                end_date: sub.end_date,
                status: sub.status,
                data_balance_mb: sub.data_balance_mb,
                voice_balance_min: sub.voice_balance_min,
                data_quota_mb: sub.data_quota_mb,
                voice_quota_min: sub.voice_quota_min,
                validity_days: sub.validity_days,
                auto_renew: sub.auto_renew,
                can_suspend: sub.can_suspend,
                can_resume: sub.can_resume,
                can_cancel: sub.can_cancel,
            }))
        },
        enabled: !!customerId,
    })
}

export const useKycStatus = (customerId?: string, options?: { refetchInterval?: number | false }) => {
    return useQuery<KycStatus>({
        queryKey: [...QUERY_KEYS.KYC_STATUS, customerId],
        queryFn: () => telecomClient.get<KycStatus>(`/store/telecom/verify-kyc/${customerId}`),
        enabled: !!customerId,
        ...options
    })
}

export const usePurchaseSim = () => {
    return useMutation({
        mutationFn: (payload: PurchaseSimPayload) =>
            telecomClient.post("/store/telecom/purchase-sim", payload),
    })
}

export const useRecharge = () => {
    return useMutation({
        mutationFn: (payload: RechargePayload) =>
            telecomClient.post("/store/telecom/recharge", payload),
    })
}

export const useVerifyKyc = () => {
    return useMutation({
        mutationFn: (payload: { customer_id: string; kyc_type: string; kyc_number: string; document_url: string }) =>
            telecomClient.post("/store/telecom/verify-kyc", payload),
    })
}
