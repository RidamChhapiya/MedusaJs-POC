/**
 * Simple script to add 1000 random MSISDN numbers
 * Uses direct database connection
 * Run with: node --loader tsx src/scripts/add-1000-msisdns.ts
 */

import { MikroORM } from "@mikro-orm/core"
import { PostgreSqlDriver } from "@mikro-orm/postgresql"

async function generateAndImportMSISDNs() {
    console.log("🚀 Starting MSISDN bulk import...")

    // Connect to database
    const orm = await MikroORM.init<PostgreSqlDriver>({
        entities: ["./src/modules/telecom-core/models"],
        dbName: process.env.POSTGRES_DATABASE || "medusa",
        host: process.env.POSTGRES_HOST || "localhost",
        port: parseInt(process.env.POSTGRES_PORT || "5432"),
        user: process.env.POSTGRES_USER || "postgres",
        password: process.env.POSTGRES_PASSWORD || "postgres",
        driver: PostgreSqlDriver,
        debug: false,
    })

    const em = orm.em.fork()

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

    // Import MSISDNs using raw SQL for better performance
    console.log("\n📤 Importing MSISDNs to database...")

    let created = 0
    let skipped = 0
    let failed = 0

    try {
        // Use batch insert for better performance
        const values = msisdns.map(m =>
            `('${m.msisdn}', '${m.status}', '${m.tier}', '${m.region}', NOW(), NOW())`
        ).join(',')

        const query = `
            INSERT INTO msisdn_inventory (msisdn, status, tier, region, created_at, updated_at)
            VALUES ${values}
            ON CONFLICT (msisdn) DO NOTHING
            RETURNING msisdn
        `

        const result = await em.getConnection().execute(query)
        created = result.affectedRows || result.length || msisdns.length
        skipped = msisdns.length - created

        console.log("\n✅ Bulk import completed!")
        console.log(`📊 Results:`)
        console.log(`  - Created: ${created}`)
        console.log(`  - Skipped (duplicates): ${skipped}`)
        console.log(`  - Failed: ${failed}`)

        // Show final inventory summary
        const summary = await em.getConnection().execute(`
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

    } catch (error) {
        console.error("❌ Import failed:", error.message)
        failed = msisdns.length
    } finally {
        await orm.close()
    }
}

// Run the script
generateAndImportMSISDNs()
    .then(() => {
        console.log("\n🎉 Script completed successfully!")
        process.exit(0)
    })
    .catch((error) => {
        console.error("\n💥 Script failed:", error)
        process.exit(1)
    })
