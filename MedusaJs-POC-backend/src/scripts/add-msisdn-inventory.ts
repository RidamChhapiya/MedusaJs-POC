import TelecomCoreModuleService from "../modules/telecom-core/service"

/**
 * Script to add 1000 random MSISDN numbers to inventory
 * All numbers will be in 'available' status
 */
async function addRandomMSISDNs() {
    console.log("Starting MSISDN inventory population...")

    // Initialize the telecom module
    const { medusaIntegrationTestRunner } = require("@medusajs/test-utils")

    medusaIntegrationTestRunner({
        moduleName: "telecom",
        testSuite: async ({ getContainer }) => {
            const container = getContainer()
            const telecomModule: TelecomCoreModuleService = container.resolve("telecom")

            const msisdnsToCreate = []
            const usedNumbers = new Set<string>()

            // Generate 1000 unique random 10-digit numbers
            console.log("Generating 1000 unique phone numbers...")
            while (msisdnsToCreate.length < 1000) {
                // Generate random 10-digit number starting with 9, 8, or 7 (Indian mobile pattern)
                const firstDigit = [9, 8, 7][Math.floor(Math.random() * 3)]
                const remainingDigits = Math.floor(Math.random() * 900000000) + 100000000
                const phoneNumber = `${firstDigit}${remainingDigits}`

                // Ensure uniqueness
                if (!usedNumbers.has(phoneNumber)) {
                    usedNumbers.add(phoneNumber)
                    msisdnsToCreate.push({
                        msisdn: phoneNumber,
                        status: "available",
                        tier: Math.random() > 0.7 ? "premium" : "standard", // 30% premium, 70% standard
                        region: ["North", "South", "East", "West", "Central"][Math.floor(Math.random() * 5)]
                    })
                }
            }

            console.log(`Generated ${msisdnsToCreate.length} unique numbers`)
            console.log("Sample numbers:", msisdnsToCreate.slice(0, 5).map(m => m.msisdn))

            // Bulk create MSISDNs in batches of 100
            const batchSize = 100
            let created = 0

            for (let i = 0; i < msisdnsToCreate.length; i += batchSize) {
                const batch = msisdnsToCreate.slice(i, i + batchSize)

                try {
                    for (const msisdn of batch) {
                        await telecomModule.createMSISDNInventories(msisdn)
                        created++
                    }
                    console.log(`Progress: ${created}/${msisdnsToCreate.length} MSISDNs created`)
                } catch (error) {
                    console.error(`Error creating batch ${i / batchSize + 1}:`, error)
                }
            }

            console.log(`\n✅ Successfully added ${created} MSISDNs to inventory!`)

            // Show summary
            const allMSISDNs = await telecomModule.listMSISDNInventories({})
            const summary = {
                total: allMSISDNs.length,
                available: allMSISDNs.filter(m => m.status === "available").length,
                premium: allMSISDNs.filter(m => m.tier === "premium").length,
                standard: allMSISDNs.filter(m => m.tier === "standard").length,
                byRegion: {
                    North: allMSISDNs.filter(m => m.region === "North").length,
                    South: allMSISDNs.filter(m => m.region === "South").length,
                    East: allMSISDNs.filter(m => m.region === "East").length,
                    West: allMSISDNs.filter(m => m.region === "West").length,
                    Central: allMSISDNs.filter(m => m.region === "Central").length,
                }
            }

            console.log("\n📊 Inventory Summary:")
            console.log(`Total MSISDNs: ${summary.total}`)
            console.log(`Available: ${summary.available}`)
            console.log(`Premium: ${summary.premium}`)
            console.log(`Standard: ${summary.standard}`)
            console.log(`By Region:`, summary.byRegion)
        }
    })
}

// Run the script
addRandomMSISDNs().catch(console.error)
