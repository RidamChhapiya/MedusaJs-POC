/**
 * Customer Onboarding & Authentication - Test Suite
 * 
 * Tests all authentication and SIM purchase flows
 */

const BASE_URL = "http://localhost:9000"

// Test data
const testCustomer = {
    full_name: "Test User",
    email: `test${Date.now()}@example.com`,
    primary_phone: `98765${Math.floor(Math.random() * 100000)}`,
    password: "TestPass123",
    address: {
        line1: "123 Test Street",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400001"
    }
}

let customerId = ""
let nexelNumber = ""

describe("Customer Authentication & Onboarding", () => {

    // Test 1: Phone Validation
    test("Should validate phone number availability", async () => {
        const response = await fetch(
            `${BASE_URL}/store/auth/validate-phone/${testCustomer.primary_phone}`
        )
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.can_register).toBe(true)
        expect(data.is_nexel_number).toBe(false)
        expect(data.is_registered).toBe(false)
    })

    // Test 2: Customer Registration
    test("Should register new customer", async () => {
        const response = await fetch(`${BASE_URL}/store/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(testCustomer)
        })
        const data = await response.json()

        expect(response.status).toBe(201)
        expect(data.success).toBe(true)
        expect(data.customer.email).toBe(testCustomer.email)
        expect(data.customer.kyc_status).toBe("pending")
        expect(data.customer.is_nexel_subscriber).toBe(false)

        customerId = data.customer.id
    })

    // Test 3: Duplicate Registration
    test("Should reject duplicate phone number", async () => {
        const response = await fetch(`${BASE_URL}/store/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(testCustomer)
        })
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe("Phone number already registered")
    })

    // Test 4: Customer Login
    test("Should login with registered phone", async () => {
        const response = await fetch(`${BASE_URL}/store/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                phone_number: testCustomer.primary_phone,
                password: testCustomer.password
            })
        })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.customer.id).toBe(customerId)
    })

    // Test 5: Invalid Login
    test("Should reject invalid credentials", async () => {
        const response = await fetch(`${BASE_URL}/store/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                phone_number: "9999999999",
                password: "wrong"
            })
        })
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.error).toBe("Invalid credentials")
    })

    // Test 6: e-KYC Submission
    test("Should submit e-KYC for verification", async () => {
        const response = await fetch(`${BASE_URL}/store/telecom/verify-kyc`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                customer_id: customerId,
                kyc_type: "aadhaar",
                kyc_number: "1234-5678-9012"
            })
        })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.kyc_status).toBe("pending")
    })

    // Test 7: e-KYC Auto-Approval
    test("Should auto-approve e-KYC after 2 seconds", async () => {
        // Wait for auto-approval
        await new Promise(resolve => setTimeout(resolve, 2500))

        const response = await fetch(
            `${BASE_URL}/store/telecom/verify-kyc/${customerId}`
        )
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.kyc_status).toBe("verified")
        expect(data.kyc_type).toBe("aadhaar")
    })

    // Test 8: Get Available Numbers
    test("Should fetch available phone numbers", async () => {
        const response = await fetch(
            `${BASE_URL}/store/telecom/purchase-sim/available-numbers?limit=5`
        )
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.available_numbers.length).toBeGreaterThan(0)

        nexelNumber = data.available_numbers[0].phone_number
    })

    // Test 9: SIM Purchase without KYC
    test("Should reject SIM purchase without verified KYC", async () => {
        // Create a new customer without KYC
        const newCustomer = {
            ...testCustomer,
            email: `test2${Date.now()}@example.com`,
            primary_phone: `98765${Math.floor(Math.random() * 100000)}`
        }

        const regResponse = await fetch(`${BASE_URL}/store/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newCustomer)
        })
        const regData = await regResponse.json()

        // Try to purchase without KYC
        const response = await fetch(`${BASE_URL}/store/telecom/purchase-sim`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                customer_id: regData.customer.id,
                plan_id: "plan_01...", // Will fail anyway
            })
        })
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe("KYC not verified")
    })

    // Test 10: SIM Purchase Success
    test("Should purchase SIM successfully", async () => {
        // Get an active plan
        const plansResponse = await fetch(`${BASE_URL}/admin/telecom/plans`)
        const plansData = await plansResponse.json()
        const plan = plansData.plans[0]

        const response = await fetch(`${BASE_URL}/store/telecom/purchase-sim`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                customer_id: customerId,
                plan_id: plan.id,
                preferred_number: nexelNumber,
                sim_password: "NexelPass123"
            })
        })
        const data = await response.json()

        expect(response.status).toBe(201)
        expect(data.success).toBe(true)
        expect(data.sim.phone_number).toBe(nexelNumber)
        expect(data.sim.status).toBe("active")
        expect(data.subscription).toBeDefined()
        expect(data.invoice.status).toBe("paid")
    })

    // Test 11: Login with Nexel Number
    test("Should login with Nexel number after purchase", async () => {
        const response = await fetch(`${BASE_URL}/store/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                phone_number: nexelNumber,
                password: "NexelPass123"
            })
        })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.customer.is_nexel_subscriber).toBe(true)
        expect(data.customer.nexel_numbers).toContain(nexelNumber)
    })

    // Test 12: MSISDN Status Check
    test("Should show MSISDN as active after purchase", async () => {
        const response = await fetch(
            `${BASE_URL}/admin/telecom/msisdn-inventory?search=${nexelNumber}`
        )
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.msisdns[0].status).toBe("active")
        expect(data.msisdns[0].customer_id).toBe(customerId)
    })
})

// Run tests
console.log("🧪 Starting Customer Onboarding Test Suite...")
console.log("=".repeat(60))
