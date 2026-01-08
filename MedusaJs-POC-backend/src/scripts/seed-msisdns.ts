import { Modules } from "@medusajs/framework/utils"

/**
 * Seed script to add 1000 random MSISDN numbers
 * Run with: npx medusa exec src/scripts/seed-msisdns.ts
 */
export default async function seedMSISDNs({ container }) {
    console.log("🚀 Starting MSISDN inventory seeding...")

    const telecomModule = container.resolve("telecom")

    const msisdns = []
    const usedNumbers = new Set<string>()

    // Generate 1000 unique random 10-digit numbers
    console.log("📱 Generating 1000 unique phone numbers...")
    while (msisdns.length < 1000) {
        // Generate random 10-digit number starting with 9, 8, or 7 (Indian mobile pattern)
        const firstDigit = [9, 8, 7][Math.floor(Math.random() * 3)]
        const remainingDigits = Math.floor(Math.random() * 900000000) + 100000000
        const phoneNumber = `${firstDigit}${remainingDigits}`

        // Ensure uniqueness
        if (!usedNumbers.has(phoneNumber)) {
            usedNumbers.add(phoneNumber)
            msisdns.push({
                msisdn: phoneNumber,
                status: "available",
                tier: Math.random() > 0.7 ? "premium" : "standard",
                region: ["North", "South", "East", "West", "Central"][Math.floor(Math.random() * 5)]
            })
        }
    }

    console.log(`✅ Generated ${msisdns.length} unique numbers`)
    console.log("📋 Sample numbers:", msisdns.slice(0, 5).map(m => m.msisdn).join(", "))

    // Import MSISDNs
    console.log("\n📤 Importing MSISDNs to database...")

    let created = 0
    let skipped = 0
    let failed = 0

    for (const msisdn of msisdns) {
        try {
            // Check if MSISDN already exists
            const existing = await telecomModule.listMSISDNInventories({
                msisdn: msisdn.msisdn
            })

            if (existing.length > 0) {
                skipped++
                continue
            }

            // Create new MSISDN
            await telecomModule.createMSISDNInventories(msisdn)
            created++

            // Show progress every 100 records
            if (created % 100 === 0) {
                console.log(`Progress: ${created}/${msisdns.length} created...`)
            }
        } catch (error) {
            failed++
            if (failed <= 5) { // Only show first 5 errors
                console.error(`Failed to create ${msisdn.msisdn}:`, error.message)
            }
        }
    }

    console.log("\n✅ Bulk import completed!")
    console.log(`📊 Results:`)
    console.log(`  - Created: ${created}`)
    console.log(`  - Skipped (duplicates): ${skipped}`)
    console.log(`  - Failed: ${failed}`)

    // Show final inventory summary
    const allMSISDNs = await telecomModule.listMSISDNInventories({})
    const summary = {
        total: allMSISDNs.length,
        available: allMSISDNs.filter(m => m.status === "available").length,
        reserved: allMSISDNs.filter(m => m.status === "reserved").length,
        active: allMSISDNs.filter(m => m.status === "active").length,
        premium: allMSISDNs.filter(m => m.tier === "premium").length,
        standard: allMSISDNs.filter(m => m.tier === "standard").length,
    }

    console.log("\n📊 Final Inventory Summary:")
    console.log(`  Total MSISDNs: ${summary.total}`)
    console.log(`  Available: ${summary.available}`)
    console.log(`  Reserved: ${summary.reserved}`)
    console.log(`  Active: ${summary.active}`)
    console.log(`  Premium: ${summary.premium}`)
    console.log(`  Standard: ${summary.standard}`)

    console.log("\n🎉 Seeding completed successfully!")
}
