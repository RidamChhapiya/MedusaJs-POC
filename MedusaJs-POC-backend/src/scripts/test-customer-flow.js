#!/usr/bin/env node

/**
 * Manual API Test Script
 * Tests customer authentication and SIM purchase flow
 */

const BASE_URL = "http://localhost:9000"

// Generate unique test data
const testPhone = `98765${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`
const testEmail = `test${Date.now()}@example.com`

let customerId = ""
let nexelNumber = ""
let planId = ""

async function runTests() {
    console.log("🧪 Starting Manual API Tests")
    console.log("=".repeat(60))

    try {
        // Test 1: Validate Phone Number
        console.log("\n📱 Test 1: Validate Phone Number")
        const validateRes = await fetch(`${BASE_URL}/store/auth/validate-phone/${testPhone}`)
        const validateData = await validateRes.json()
        console.log(`Status: ${validateRes.status}`)
        console.log(`Can Register: ${validateData.can_register}`)
        console.log(`✅ PASS`)

        // Test 2: Register Customer
        console.log("\n👤 Test 2: Register Customer")
        const registerRes = await fetch(`${BASE_URL}/store/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                full_name: "Test User",
                email: testEmail,
                primary_phone: testPhone,
                password: "TestPass123",
                address: {
                    line1: "123 Test St",
                    city: "Mumbai",
                    state: "Maharashtra",
                    pincode: "400001"
                }
            })
        })
        const registerData = await registerRes.json()
        console.log(`Status: ${registerRes.status}`)

        if (registerRes.status !== 201) {
            console.log("❌ FAIL:", registerData)
            return
        }

        customerId = registerData.customer.id
        console.log(`Customer ID: ${customerId}`)
        console.log(`✅ PASS`)

        // Test 3: Login
        console.log("\n🔐 Test 3: Login")
        const loginRes = await fetch(`${BASE_URL}/store/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                phone_number: testPhone,
                password: "TestPass123"
            })
        })
        const loginData = await loginRes.json()
        console.log(`Status: ${loginRes.status}`)

        if (loginRes.status !== 200) {
            console.log("❌ FAIL:", loginData)
            return
        }
        console.log(`✅ PASS`)

        // Test 4: Submit e-KYC
        console.log("\n📄 Test 4: Submit e-KYC")
        const kycRes = await fetch(`${BASE_URL}/store/telecom/verify-kyc`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                customer_id: customerId,
                kyc_type: "aadhaar",
                kyc_number: "1234-5678-9012"
            })
        })
        const kycData = await kycRes.json()
        console.log(`Status: ${kycRes.status}`)

        if (kycRes.status !== 200) {
            console.log("❌ FAIL:", kycData)
            return
        }
        console.log(`✅ PASS - Waiting for auto-approval...`)

        // Wait for auto-approval
        await new Promise(resolve => setTimeout(resolve, 2500))

        // Test 5: Check KYC Status
        console.log("\n✓ Test 5: Check KYC Status")
        const kycStatusRes = await fetch(`${BASE_URL}/store/telecom/verify-kyc/${customerId}`)
        const kycStatusData = await kycStatusRes.json()
        console.log(`Status: ${kycStatusRes.status}`)
        console.log(`KYC Status: ${kycStatusData.kyc_status}`)

        if (kycStatusData.kyc_status !== "verified") {
            console.log("❌ FAIL: KYC not verified")
            return
        }
        console.log(`✅ PASS`)

        // Test 6: Get Available Plans
        console.log("\n📋 Test 6: Get Available Plans")
        const plansRes = await fetch(`${BASE_URL}/admin/telecom/plans`)
        const plansData = await plansRes.json()
        console.log(`Status: ${plansRes.status}`)

        if (!plansData.plans || plansData.plans.length === 0) {
            console.log("❌ FAIL: No plans available")
            return
        }

        planId = plansData.plans[0].id
        console.log(`Plan ID: ${planId}`)
        console.log(`Plan Name: ${plansData.plans[0].name}`)
        console.log(`✅ PASS`)

        // Test 7: Get Available Numbers
        console.log("\n📞 Test 7: Get Available Numbers")
        const numbersRes = await fetch(`${BASE_URL}/store/telecom/purchase-sim/available-numbers?limit=5`)
        const numbersData = await numbersRes.json()
        console.log(`Status: ${numbersRes.status}`)

        if (!numbersData.available_numbers || numbersData.available_numbers.length === 0) {
            console.log("❌ FAIL: No numbers available")
            return
        }

        nexelNumber = numbersData.available_numbers[0].phone_number
        console.log(`Available Number: ${nexelNumber}`)
        console.log(`✅ PASS`)

        // Test 8: Purchase SIM
        console.log("\n🛒 Test 8: Purchase SIM")
        const purchaseRes = await fetch(`${BASE_URL}/store/telecom/purchase-sim`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                customer_id: customerId,
                plan_id: planId,
                preferred_number: nexelNumber,
                sim_password: "NexelPass123"
            })
        })
        const purchaseData = await purchaseRes.json()
        console.log(`Status: ${purchaseRes.status}`)

        if (purchaseRes.status !== 201) {
            console.log("❌ FAIL:", purchaseData)
            return
        }

        console.log(`Phone Number: ${purchaseData.sim.phone_number}`)
        console.log(`Status: ${purchaseData.sim.status}`)
        console.log(`Subscription ID: ${purchaseData.subscription.id}`)
        console.log(`Invoice: ${purchaseData.invoice.invoice_number}`)
        console.log(`✅ PASS`)

        // Test 9: Login with Nexel Number
        console.log("\n🔐 Test 9: Login with Nexel Number")
        const nexelLoginRes = await fetch(`${BASE_URL}/store/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                phone_number: nexelNumber,
                password: "NexelPass123"
            })
        })
        const nexelLoginData = await nexelLoginRes.json()
        console.log(`Status: ${nexelLoginRes.status}`)

        if (nexelLoginRes.status !== 200) {
            console.log("❌ FAIL:", nexelLoginData)
            return
        }

        console.log(`Is Nexel Subscriber: ${nexelLoginData.customer.is_nexel_subscriber}`)
        console.log(`Nexel Numbers: ${nexelLoginData.customer.nexel_numbers.join(", ")}`)
        console.log(`✅ PASS`)

        // Test 10: Verify MSISDN Status
        console.log("\n📱 Test 10: Verify MSISDN Status")
        const msisdnRes = await fetch(`${BASE_URL}/admin/telecom/msisdn-inventory?search=${nexelNumber}`)
        const msisdnData = await msisdnRes.json()
        console.log(`Status: ${msisdnRes.status}`)

        if (msisdnData.msisdns[0].status !== "active") {
            console.log("❌ FAIL: MSISDN not active")
            return
        }

        console.log(`MSISDN Status: ${msisdnData.msisdns[0].status}`)
        console.log(`Customer ID: ${msisdnData.msisdns[0].customer_id}`)
        console.log(`✅ PASS`)

        console.log("\n" + "=".repeat(60))
        console.log("🎉 ALL TESTS PASSED!")
        console.log("=".repeat(60))

    } catch (error) {
        console.error("\n❌ TEST FAILED:", error.message)
        console.error(error.stack)
    }
}

// Run the tests
runTests()
