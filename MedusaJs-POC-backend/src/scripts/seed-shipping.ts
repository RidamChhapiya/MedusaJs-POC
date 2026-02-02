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
  linkSalesChannelsToStockLocationWorkflow,
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
  const salesChannelModule = container.resolve(Modules.SALES_CHANNEL)
  const productModule = container.resolve(Modules.PRODUCT)

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

    // 3b. Link stock location to default sales channel (required for store API to return shipping options)
    const salesChannels = await salesChannelModule.listSalesChannels({}, { take: 10 })
    const defaultSalesChannel = salesChannels.find((sc: { name?: string }) => sc.name === "Default Sales Channel") ?? salesChannels[0]
    if (defaultSalesChannel) {
      try {
        await linkSalesChannelsToStockLocationWorkflow(container).run({
          input: {
            id: stockLocation.id,
            add: [defaultSalesChannel.id],
          },
        })
        logger.info(`✅ Linked stock location to sales channel: ${defaultSalesChannel.name}`)
      } catch (e: any) {
        if (e.message?.includes("already exists") || e.message?.includes("duplicate")) {
          logger.info("ℹ️  Stock location already linked to sales channel")
        } else throw e
      }
    } else {
      logger.warn("⚠️  No sales channel found. Create a Default Sales Channel in Medusa Admin and link your publishable API key to it, then re-run this script.")
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

    // 4b. Link all products to the default shipping profile (required for "Place order" to pass validation)
    const products = await productModule.listProducts({}, { take: 500 })
    let linkedCount = 0
    for (const product of products) {
      try {
        await link.create({
          [Modules.PRODUCT]: { product_id: product.id },
          [Modules.FULFILLMENT]: { shipping_profile_id: shippingProfile.id },
        })
        linkedCount++
      } catch (e: any) {
        if (e.message?.includes("already exists") || e.message?.includes("duplicate")) {
          // already linked
        } else throw e
      }
    }
    if (linkedCount > 0) {
      logger.info(`✅ Linked ${linkedCount} product(s) to shipping profile: ${shippingProfile.name}`)
    } else if (products.length > 0) {
      logger.info(`ℹ️  Products already linked to shipping profile`)
    }

    // 5. Build geo_zones: merge ALL regions' countries with DEFAULT_COUNTRIES so shipping
    //    works for any address (e.g. Denmark storefront /dk but India address, or vice versa)
    const allRegions = await regionModule.listRegions({}, { take: 50 })
    const regionCountryCodes = new Set<string>()
    for (const r of allRegions) {
      for (const c of r.countries ?? []) {
        const code = (c?.iso_2 ?? "").toLowerCase()
        if (code) regionCountryCodes.add(code)
      }
    }
    const mergedCodes = [...new Set([...regionCountryCodes, ...DEFAULT_COUNTRIES])]
    const countryCodes = mergedCodes.length ? mergedCodes : DEFAULT_COUNTRIES
    logger.info(`ℹ️  Service zone will cover countries: ${countryCodes.join(", ")}`)

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
      // Ensure existing service zone has geo_zones for all merged countries (e.g. India + Denmark)
      const withGeoZones = await fulfillmentModule.listFulfillmentSets(
        { id: fulfillmentSet.id },
        { relations: ["service_zones.geo_zones"], take: 1 }
      )
      const existingServiceZone = withGeoZones[0]?.service_zones?.[0]
      const existingGeoZones = (existingServiceZone as { geo_zones?: { type?: string; country_code?: string }[] })?.geo_zones ?? []
      const existingCountryCodes = new Set(
        existingGeoZones.filter((g) => g.type === "country").map((g) => (g.country_code ?? "").toLowerCase())
      )
      const missingCountries = countryCodes.filter((c) => !existingCountryCodes.has(c.toLowerCase()))
      if (missingCountries.length > 0 && existingServiceZone?.id) {
        for (const code of missingCountries) {
          try {
            await fulfillmentModule.createGeoZones({
              service_zone_id: existingServiceZone.id,
              type: "country",
              country_code: code,
            })
            logger.info(`✅ Added geo_zone for country: ${code}`)
          } catch (e: any) {
            if (e.message?.includes("already exists") || e.message?.includes("duplicate")) {
              logger.info(`ℹ️  Geo zone for ${code} already exists`)
            } else throw e
          }
        }
      }
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

    // 8. List existing shipping options for this service zone (no address filter = list all)
    const existingOptions = await fulfillmentModule.listShippingOptions(
      { service_zone: { id: serviceZoneId } } as any,
      { take: 20 }
    )
    const existingNames = new Set((existingOptions ?? []).map((o: { name?: string }) => (o?.name ?? "").toLowerCase()))

    // 8b. Rename "SIM delivery" (or similar) to a generic phones & accessories name
    for (const opt of existingOptions ?? []) {
      const name = (opt?.name ?? "").trim()
      if (/sim\s*delivery/i.test(name)) {
        try {
          await fulfillmentModule.updateShippingOptions(opt.id, {
            name: "Standard delivery (phones & accessories)",
          })
          logger.info(`✅ Renamed shipping option "${name}" → "Standard delivery (phones & accessories)"`)
        } catch (e: any) {
          logger.warn("⚠️  Could not rename shipping option: " + (e?.message ?? String(e)))
        }
        break
      }
    }

    // 9. Ensure we have multiple options: Standard + Express (add only if missing)
    const basePrices: Array<{ currency_code: string; amount: number } | { region_id: string; amount: number }> = [
      { currency_code: "usd", amount: 500 },
      { currency_code: "eur", amount: 500 },
      { currency_code: "inr", amount: 99 },
    ]
    if (region?.id) {
      basePrices.push({ region_id: region.id, amount: 500 })
    }

    const rules = [
      { attribute: "enabled_in_store", value: "true", operator: "eq" as const },
      { attribute: "is_return", value: "false", operator: "eq" as const },
    ]

    const optionsToCreate: any[] = []

    if (!existingNames.has("standard shipping")) {
      optionsToCreate.push({
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
        prices: basePrices,
        rules,
      })
    }
    if (!existingNames.has("express shipping")) {
      const expressPrices = basePrices.map((p) => {
        const amount = Math.round((p as { amount: number }).amount * 1.8)
        return "currency_code" in p
          ? { currency_code: (p as { currency_code: string }).currency_code, amount }
          : { region_id: (p as { region_id: string }).region_id, amount }
      }) as typeof basePrices
      optionsToCreate.push({
        name: "Express Shipping",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: serviceZoneId,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Express",
          description: "Delivery in 1–2 business days.",
          code: "express",
        },
        prices: expressPrices,
        rules,
      })
    }

    if (optionsToCreate.length > 0) {
      await createShippingOptionsWorkflow(container).run({
        input: optionsToCreate,
      })
      optionsToCreate.forEach((o) => logger.info(`✅ Created shipping option: ${o.name}`))
    }

    logger.info("✅ Shipping seed complete. Checkout should now show multiple shipping methods.")
  } catch (error: any) {
    logger.error("❌ Shipping seed failed: " + (error?.message ?? String(error)))
    throw error
  }
}
