/**
 * Seed fulfillment and shipping options so checkout has at least one shipping method.
 * Run: npx medusa exec ./src/scripts/seed-shipping.ts
 *
 * Prerequisites:
 * - At least one region exists (create via Medusa Admin or region seed).
 * - Default Sales Channel exists.
 */

import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
} from "@medusajs/medusa/core-flows"

// Countries to offer shipping (expand as needed; must match your regions)
const DEFAULT_COUNTRIES = [
  "in",
  "dk",
  "us",
  "gb",
  "de",
  "se",
  "fr",
  "es",
  "it",
  "no",
]

export default async function seedShipping({ container }: ExecArgs) {
  const logger = container.resolve("logger")
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const fulfillmentModule = container.resolve(Modules.FULFILLMENT)
  const regionModule = container.resolve(Modules.REGION)
  const stockLocationModule = container.resolve(Modules.STOCK_LOCATION)

  logger.info("🚚 Seeding fulfillment and shipping options...")

  try {
    // 1. Get first region (for prices and optional geo_zones)
    const regions = await regionModule.listRegions({}, { take: 1 })
    const region = regions[0]
    if (!region) {
      logger.warn("⚠️  No region found. Create a region in Medusa Admin first. Using currency-only prices.")
    }

    // 2. Get or create stock location
    let stockLocation
    const existingLocations = await stockLocationModule.listStockLocations({
      name: "India Warehouse",
    })
    if (existingLocations.length > 0) {
      stockLocation = existingLocations[0]
      logger.info(`ℹ️  Using existing stock location: ${stockLocation.name}`)
    } else {
      const allLocations = await stockLocationModule.listStockLocations({}, { take: 1 })
      if (allLocations.length > 0) {
        stockLocation = allLocations[0]
        logger.info(`ℹ️  Using existing stock location: ${stockLocation.name}`)
      } else {
        stockLocation = await stockLocationModule.createStockLocations({
          name: "Main Warehouse",
          address: {
            address_1: "123 Commerce St",
            city: "Mumbai",
            country_code: "in",
            postal_code: "400001",
          },
        })
        logger.info(`✅ Created stock location: ${stockLocation.name} (${stockLocation.id})`)
      }
    }

    // 3. Link stock location to fulfillment provider (manual_manual)
    try {
      await link.create({
        [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
        [Modules.FULFILLMENT]: { fulfillment_provider_id: "manual_manual" },
      })
      logger.info("✅ Linked stock location to fulfillment provider (manual_manual)")
    } catch (e: any) {
      if (e.message?.includes("already exists") || e.message?.includes("duplicate")) {
        logger.info("ℹ️  Stock location already linked to fulfillment provider")
      } else throw e
    }

    // 4. Get or create default shipping profile
    let shippingProfiles = await fulfillmentModule.listShippingProfiles({ type: "default" })
    let shippingProfile = shippingProfiles[0]
    if (!shippingProfile) {
      const { result } = await createShippingProfilesWorkflow(container).run({
        input: {
          data: [
            { name: "Default Shipping Profile", type: "default" },
          ],
        },
      })
      shippingProfile = result[0]
      logger.info(`✅ Created shipping profile: ${shippingProfile.name}`)
    } else {
      logger.info(`ℹ️  Using existing shipping profile: ${shippingProfile.name}`)
    }

    // 5. Build geo_zones from region countries or default list
    const countryCodes = region?.countries?.length
      ? region.countries.map((c: { iso_2?: string }) => (c?.iso_2 ?? "").toLowerCase()).filter(Boolean)
      : DEFAULT_COUNTRIES

    const geoZones = countryCodes.map((code: string) => ({
      type: "country" as const,
      country_code: code,
    }))

    // 6. Check if we already have a shipping fulfillment set
    const existingSets = await fulfillmentModule.listFulfillmentSets(
      { type: "shipping" },
      { take: 1, relations: ["service_zones"] }
    )
    let fulfillmentSet = existingSets[0]

    if (!fulfillmentSet) {
      const created = await fulfillmentModule.createFulfillmentSets({
        name: "Standard delivery",
        type: "shipping",
        service_zones: [
          {
            name: "Default zone",
            geo_zones: geoZones,
          },
        ],
      })
      fulfillmentSet = Array.isArray(created) ? created[0] : created
      logger.info(`✅ Created fulfillment set: ${fulfillmentSet.name} (${fulfillmentSet.id})`)
    } else {
      logger.info(`ℹ️  Using existing fulfillment set: ${fulfillmentSet.name}`)
    }

    // Get service zone id (from nested create or from relations)
    let serviceZoneId: string | undefined
    if (fulfillmentSet.service_zones?.length) {
      serviceZoneId = fulfillmentSet.service_zones[0].id
    }
    if (!serviceZoneId) {
      const withZones = await fulfillmentModule.listFulfillmentSets(
        { id: fulfillmentSet.id },
        { relations: ["service_zones"], take: 1 }
      )
      serviceZoneId = withZones[0]?.service_zones?.[0]?.id
    }
    if (!serviceZoneId) {
      const serviceZones = await fulfillmentModule.createServiceZones({
        fulfillment_set_id: fulfillmentSet.id,
        name: "Default zone",
        geo_zones: geoZones,
      })
      serviceZoneId = Array.isArray(serviceZones) ? serviceZones[0]?.id : (serviceZones as { id: string })?.id
      logger.info(`✅ Created service zone for fulfillment set`)
    }

    if (!serviceZoneId) {
      throw new Error("Could not get or create service zone")
    }

    // 7. Link stock location to fulfillment set
    try {
      await link.create({
        [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
        [Modules.FULFILLMENT]: { fulfillment_set_id: fulfillmentSet.id },
      })
      logger.info("✅ Linked stock location to fulfillment set")
    } catch (e: any) {
      if (e.message?.includes("already exists") || e.message?.includes("duplicate")) {
        logger.info("ℹ️  Stock location already linked to fulfillment set")
      } else throw e
    }

    // 8. Check if we already have shipping options for this service zone
    const existingOptions = await fulfillmentModule.listShippingOptions(
      { service_zone_id: serviceZoneId },
      { take: 1 }
    )
    if (existingOptions.length > 0) {
      logger.info("ℹ️  Shipping options already exist for this zone. Skipping creation.")
      logger.info("✅ Shipping seed complete.")
      return
    }

    // 9. Create at least one flat-rate shipping option
    const prices: Array<{ currency_code: string; amount: number } | { region_id: string; amount: number }> = [
      { currency_code: "usd", amount: 500 },
      { currency_code: "eur", amount: 500 },
      { currency_code: "inr", amount: 99 },
    ]
    if (region?.id) {
      prices.push({ region_id: region.id, amount: 500 })
    }

    await createShippingOptionsWorkflow(container).run({
      input: [
        {
          name: "Standard Shipping",
          price_type: "flat",
          provider_id: "manual_manual",
          service_zone_id: serviceZoneId,
          shipping_profile_id: shippingProfile.id,
          type: {
            label: "Standard",
            description: "Delivery in 3–5 business days.",
            code: "standard",
          },
          prices,
          rules: [
            { attribute: "enabled_in_store", value: "true", operator: "eq" },
            { attribute: "is_return", value: "false", operator: "eq" },
          ],
        },
      ],
    })

    logger.info("✅ Created shipping option: Standard Shipping")
    logger.info("✅ Shipping seed complete. Checkout should now show shipping methods.")
  } catch (error: any) {
    logger.error("❌ Shipping seed failed: " + (error?.message ?? String(error)))
    throw error
  }
}
