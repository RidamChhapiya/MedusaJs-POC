/**
 * Seed script to add 1000 random MSISDN numbers using direct SQL
 * Run with: npx medusa exec src/scripts/seed-msisdns-sql.ts
 */
export default async function seedMSISDNs({ container }) {
    console.log("🚀 Starting MSISDN inventory seeding...")

    // Get database manager
    const manager = container.resolve("manager")

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
            const tier = Math.random() > 0.7 ? "premium" : "standard"
            const region = ["North", "South", "East", "West", "Central"][Math.floor(Math.random() * 5)]
            msisdns.push({ msisdn: phoneNumber, tier, region })
        }
    }

    console.log(`✅ Generated ${msisdns.length} unique numbers`)
    console.log("📋 Sample numbers:", msisdns.slice(0, 5).map(m => m.msisdn).join(", "))

    // Import MSISDNs using SQL
    console.log("\n📤 Importing MSISDNs to database...")

    try {
        // Build values for batch insert
        const values = msisdns.map(m =>
            `('${m.msisdn}', 'available', '${m.tier}', '${m.region}', NOW(), NOW())`
        ).join(',\n')

        const query = `
            INSERT INTO msisdn_inventory (msisdn, status, tier, region, created_at, updated_at)
            VALUES ${values}
            ON CONFLICT (msisdn) DO NOTHING
        `

        const result = await manager.query(query)

        console.log("\n✅ Bulk import completed!")
        console.log(`📊 Created: ${msisdns.length} MSISDNs`)

        // Show final inventory summary
        const summary = await manager.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'available') as available,
                COUNT(*) FILTER (WHERE status = 'reserved') as reserved,
                COUNT(*) FILTER (WHERE status = 'active') as active,
                COUNT(*) FILTER (WHERE tier = 'premium') as premium,
                COUNT(*) FILTER (WHERE tier = 'standard') as standard
            FROM msisdn_inventory
        `)

        const stats = summary[0]
        console.log("\n📊 Final Inventory Summary:")
        console.log(`  Total MSISDNs: ${stats.total}`)
        console.log(`  Available: ${stats.available}`)
        console.log(`  Reserved: ${stats.reserved}`)
        console.log(`  Active: ${stats.active}`)
        console.log(`  Premium: ${stats.premium}`)
        console.log(`  Standard: ${stats.standard}`)

        console.log("\n🎉 Seeding completed successfully!")
    } catch (error) {
        console.error("\n❌ Import failed:", error.message)
        throw error
    }
}
