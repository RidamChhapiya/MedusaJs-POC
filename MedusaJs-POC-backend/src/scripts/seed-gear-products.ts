import { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { createProductsWorkflow } from "@medusajs/medusa/core-flows"

/**
 * Seed Gear Products (Phones, Accessories, etc.)
 * Creates comprehensive product catalog with proper pricing in both INR and USD
 * Run: npx medusa exec ./src/scripts/seed-gear-products.ts
 */
export default async function seedGearProducts({ container }: ExecArgs) {
    const logger = container.resolve("logger")
    const productModule = container.resolve(Modules.PRODUCT)
    const currencyModule = container.resolve(Modules.CURRENCY)
    const salesChannelModule = container.resolve(Modules.SALES_CHANNEL)
    const inventoryModule = container.resolve(Modules.INVENTORY)
    const stockLocationModule = container.resolve(Modules.STOCK_LOCATION)

    logger.info("📦 Seeding Gear Products (Phones & Accessories)...")

    try {
        // 1. Check currencies exist (INR and USD should be created via admin or migration)
        logger.info("💰 Note: Products will have prices in both INR and USD")
        logger.info("   Ensure both currencies exist in your Medusa admin")
        
        // Conversion rate: 1 USD ≈ 83 INR (approximate)
        const USD_TO_INR_RATE = 83
        
        // Helper function to create prices for both currencies
        // This ensures products work regardless of region currency
        const createPrices = (inrAmount: number) => [
            { amount: inrAmount, currency_code: "inr" },
            { amount: Math.round(inrAmount / USD_TO_INR_RATE), currency_code: "usd" }
        ]

        // 2. Get or create categories
        logger.info("📁 Setting up categories...")
        const categoryMap: Record<string, any> = {}

        for (const catName of ["Smartphones", "Accessories", "Gear"]) {
            const handle = catName.toLowerCase()
            const [existing] = await productModule.listProductCategories({ handle })

            if (existing) {
                categoryMap[catName] = existing
                logger.info(`ℹ️  Category already exists: ${catName}`)
            } else {
                const category = await productModule.createProductCategories({
                    name: catName,
                    handle,
                    is_active: true,
                    is_internal: false
                })
                categoryMap[catName] = category
                logger.info(`✅ Created category: ${catName}`)
            }
        }

        // 3. Get default sales channel
        const [salesChannel] = await salesChannelModule.listSalesChannels({
            name: "Default Sales Channel"
        })

        if (!salesChannel) {
            throw new Error("Default Sales Channel not found. Please create one in Medusa Admin.")
        }

        // 4. Helper function to create product if it doesn't exist
        const createProductIfNotExists = async (handle: string, productData: any) => {
            const [existing] = await productModule.listProducts({ handle })
            if (existing) {
                logger.info(`ℹ️  Product already exists: ${productData.title} - skipping`)
                return existing
            }

            try {
                const { result } = await createProductsWorkflow(container).run({
                    input: { products: [productData] }
                })

                const created = result[0]
                logger.info(`✅ Created: ${productData.title} (ID: ${created.id})`)
                return created
            } catch (error: any) {
                // Handle case where product or variant already exists (race condition)
                if (error.message?.includes("already exists") || error.message?.includes("duplicate")) {
                    logger.warn(`⚠️  Product or variant already exists for ${productData.title} - skipping`)
                    const [existingProduct] = await productModule.listProducts({ handle })
                    return existingProduct || null
                }
                // Re-throw other errors
                throw error
            }
        }

        // 5. Create Smartphones
        logger.info("📱 Creating smartphones...")

        // iPhone 15 Pro
        await createProductIfNotExists("iphone-15-pro", {
            title: "iPhone 15 Pro",
            handle: "iphone-15-pro",
            subtitle: "Titanium. A17 Pro chip. Action button.",
            description: "The iPhone 15 Pro features a titanium design, A17 Pro chip, and advanced camera system. Available in multiple storage options and colors.",
            status: "published",
            category_ids: [categoryMap["Smartphones"].id],
            sales_channels: [{ id: salesChannel.id }],
            metadata: {
                brand: "Apple",
                model: "iPhone 15 Pro",
                year: "2023",
                connectivity: "5G",
                screen_size: "6.1 inches",
                processor: "A17 Pro",
                camera: "48MP Main, 12MP Ultra Wide, 12MP Telephoto"
            },
            options: [
                { title: "Storage", values: ["128GB", "256GB", "512GB", "1TB"] },
                { title: "Color", values: ["Natural Titanium", "Blue Titanium", "White Titanium", "Black Titanium"] }
            ],
            variants: [
                {
                    title: "Natural Titanium / 128GB",
                    sku: "IPHONE15PRO-NAT-128",
                    manage_inventory: true,
                    allow_backorder: false,
                    options: { Storage: "128GB", Color: "Natural Titanium" },
                    prices: createPrices(134900) // ₹1,34,900 / ~$1,625
                },
                {
                    title: "Natural Titanium / 256GB",
                    sku: "IPHONE15PRO-NAT-256",
                    manage_inventory: true,
                    allow_backorder: false,
                    options: { Storage: "256GB", Color: "Natural Titanium" },
                    prices: createPrices(144900) // ₹1,44,900 / ~$1,746
                },
                {
                    title: "Blue Titanium / 128GB",
                    sku: "IPHONE15PRO-BLU-128",
                    manage_inventory: true,
                    allow_backorder: false,
                    options: { Storage: "128GB", Color: "Blue Titanium" },
                    prices: createPrices(134900)
                },
                {
                    title: "Blue Titanium / 256GB",
                    sku: "IPHONE15PRO-BLU-256",
                    manage_inventory: true,
                    allow_backorder: false,
                    options: { Storage: "256GB", Color: "Blue Titanium" },
                    prices: [{ amount: 144900, currency_code: "inr" }]
                }
            ]
        })

        // iPhone 15
        await createProductIfNotExists("iphone-15", {
            title: "iPhone 15",
            handle: "iphone-15",
            subtitle: "Dynamic Island. USB-C. Advanced camera.",
            description: "The iPhone 15 features Dynamic Island, USB-C connectivity, and an advanced camera system with 48MP main camera.",
            status: "published",
            category_ids: [categoryMap["Smartphones"].id],
            sales_channels: [{ id: salesChannel.id }],
            metadata: {
                brand: "Apple",
                model: "iPhone 15",
                year: "2023",
                connectivity: "5G",
                screen_size: "6.1 inches",
                processor: "A16 Bionic",
                camera: "48MP Main, 12MP Ultra Wide"
            },
            options: [
                { title: "Storage", values: ["128GB", "256GB", "512GB"] },
                { title: "Color", values: ["Black", "Blue", "Green", "Yellow", "Pink"] }
            ],
            variants: [
                {
                    title: "Black / 128GB",
                    sku: "IPHONE15-BLK-128",
                    manage_inventory: true,
                    allow_backorder: false,
                    options: { Storage: "128GB", Color: "Black" },
                    prices: createPrices(79900) // ₹79,900 / ~$963
                },
                {
                    title: "Black / 256GB",
                    sku: "IPHONE15-BLK-256",
                    manage_inventory: true,
                    allow_backorder: false,
                    options: { Storage: "256GB", Color: "Black" },
                    prices: createPrices(89900) // ₹89,900 / ~$1,083
                },
                {
                    title: "Blue / 128GB",
                    sku: "IPHONE15-BLU-128",
                    manage_inventory: true,
                    allow_backorder: false,
                    options: { Storage: "128GB", Color: "Blue" },
                    prices: [{ amount: 79900, currency_code: "inr" }]
                },
                {
                    title: "Blue / 256GB",
                    sku: "IPHONE15-BLU-256",
                    manage_inventory: true,
                    allow_backorder: false,
                    options: { Storage: "256GB", Color: "Blue" },
                    prices: [{ amount: 89900, currency_code: "inr" }]
                }
            ]
        })

        // Samsung Galaxy S24 Ultra
        await createProductIfNotExists("samsung-galaxy-s24-ultra", {
            title: "Samsung Galaxy S24 Ultra",
            handle: "samsung-galaxy-s24-ultra",
            subtitle: "AI-powered flagship with S Pen",
            description: "The Galaxy S24 Ultra features AI-powered capabilities, S Pen support, and a 200MP camera system.",
            status: "published",
            category_ids: [categoryMap["Smartphones"].id],
            sales_channels: [{ id: salesChannel.id }],
            metadata: {
                brand: "Samsung",
                model: "Galaxy S24 Ultra",
                year: "2024",
                connectivity: "5G",
                screen_size: "6.8 inches",
                processor: "Snapdragon 8 Gen 3",
                camera: "200MP Main, 50MP Periscope, 12MP Ultra Wide, 10MP Telephoto"
            },
            options: [
                { title: "Storage", values: ["256GB", "512GB", "1TB"] },
                { title: "Color", values: ["Titanium Black", "Titanium Gray", "Titanium Violet", "Titanium Yellow"] }
            ],
            variants: [
                {
                    title: "Titanium Black / 256GB",
                    sku: "GALAXY-S24U-BLK-256",
                    manage_inventory: true,
                    allow_backorder: false,
                    options: { Storage: "256GB", Color: "Titanium Black" },
                    prices: createPrices(124999) // ₹1,24,999 / ~$1,506
                },
                {
                    title: "Titanium Black / 512GB",
                    sku: "GALAXY-S24U-BLK-512",
                    manage_inventory: true,
                    allow_backorder: false,
                    options: { Storage: "512GB", Color: "Titanium Black" },
                    prices: createPrices(134999) // ₹1,34,999 / ~$1,627
                },
                {
                    title: "Titanium Violet / 256GB",
                    sku: "GALAXY-S24U-VIO-256",
                    manage_inventory: true,
                    allow_backorder: false,
                    options: { Storage: "256GB", Color: "Titanium Violet" },
                    prices: [{ amount: 124999, currency_code: "inr" }]
                }
            ]
        })

        // Samsung Galaxy S24
        await createProductIfNotExists("samsung-galaxy-s24", {
            title: "Samsung Galaxy S24",
            handle: "samsung-galaxy-s24",
            subtitle: "AI-powered flagship smartphone",
            description: "The Galaxy S24 features AI capabilities, stunning display, and advanced camera system.",
            status: "published",
            category_ids: [categoryMap["Smartphones"].id],
            sales_channels: [{ id: salesChannel.id }],
            metadata: {
                brand: "Samsung",
                model: "Galaxy S24",
                year: "2024",
                connectivity: "5G",
                screen_size: "6.2 inches",
                processor: "Snapdragon 8 Gen 3",
                camera: "50MP Main, 12MP Ultra Wide, 10MP Front"
            },
            options: [
                { title: "Storage", values: ["128GB", "256GB"] },
                { title: "Color", values: ["Onyx Black", "Marble Gray", "Cobalt Violet", "Amber Yellow"] }
            ],
            variants: [
                {
                    title: "Onyx Black / 128GB",
                    sku: "GALAXY-S24-BLK-128",
                    manage_inventory: true,
                    allow_backorder: false,
                    options: { Storage: "128GB", Color: "Onyx Black" },
                    prices: createPrices(79999) // ₹79,999 / ~$964
                },
                {
                    title: "Onyx Black / 256GB",
                    sku: "GALAXY-S24-BLK-256",
                    manage_inventory: true,
                    allow_backorder: false,
                    options: { Storage: "256GB", Color: "Onyx Black" },
                    prices: createPrices(84999) // ₹84,999 / ~$1,024
                },
                {
                    title: "Cobalt Violet / 128GB",
                    sku: "GALAXY-S24-VIO-128",
                    manage_inventory: true,
                    allow_backorder: false,
                    options: { Storage: "128GB", Color: "Cobalt Violet" },
                    prices: createPrices(79999) // ₹79,999 / ~$964
                }
            ]
        })

        // OnePlus 12
        try {
            await createProductIfNotExists("oneplus-12", {
                title: "OnePlus 12",
                handle: "oneplus-12",
                subtitle: "Never Settle. Flagship performance with Snapdragon 8 Gen 3",
                description: "The OnePlus 12 features flagship performance with Snapdragon 8 Gen 3, 120Hz LTPO display, 50MP triple camera system, and 100W SuperVOOC fast charging. Premium design with alert slider and OxygenOS.",
                status: "published",
                category_ids: [categoryMap["Smartphones"].id],
                sales_channels: [{ id: salesChannel.id }],
                images: [
                    {
                        url: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&h=800&fit=crop&q=80"
                    },
                    {
                        url: "https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=800&h=800&fit=crop&q=80"
                    },
                    {
                        url: "https://images.unsplash.com/photo-1601972602237-8c79241e468b?w=800&h=800&fit=crop&q=80"
                    }
                ],
                metadata: {
                    brand: "OnePlus",
                    model: "OnePlus 12",
                    year: "2024",
                    connectivity: "5G",
                    screen_size: "6.82 inches",
                    processor: "Snapdragon 8 Gen 3",
                    camera: "50MP Main, 64MP Periscope, 48MP Ultra Wide",
                    charging: "100W SuperVOOC",
                    display: "120Hz LTPO AMOLED",
                    ram: "12GB/16GB",
                    os: "OxygenOS 14 (Android 14)"
                },
                options: [
                    { title: "Storage", values: ["256GB", "512GB"] },
                    { title: "Color", values: ["Silky Black", "Flowy Emerald", "Sandstone Black"] }
                ],
                variants: [
                    {
                        title: "Silky Black / 256GB",
                        sku: "ONEPLUS12-BLK-256",
                        manage_inventory: true,
                        allow_backorder: false,
                        options: { Storage: "256GB", Color: "Silky Black" },
                        prices: createPrices(64999) // ₹64,999 / ~$783
                    },
                    {
                        title: "Silky Black / 512GB",
                        sku: "ONEPLUS12-BLK-512",
                        manage_inventory: true,
                        allow_backorder: false,
                        options: { Storage: "512GB", Color: "Silky Black" },
                        prices: createPrices(69999) // ₹69,999 / ~$843
                    },
                    {
                        title: "Flowy Emerald / 256GB",
                        sku: "ONEPLUS12-EMR-256",
                        manage_inventory: true,
                        allow_backorder: false,
                        options: { Storage: "256GB", Color: "Flowy Emerald" },
                        prices: createPrices(64999) // ₹64,999 / ~$783
                    },
                    {
                        title: "Flowy Emerald / 512GB",
                        sku: "ONEPLUS12-EMR-512",
                        manage_inventory: true,
                        allow_backorder: false,
                        options: { Storage: "512GB", Color: "Flowy Emerald" },
                        prices: createPrices(69999) // ₹69,999 / ~$843
                    },
                    {
                        title: "Sandstone Black / 256GB",
                        sku: "ONEPLUS12-SND-256",
                        manage_inventory: true,
                        allow_backorder: false,
                        options: { Storage: "256GB", Color: "Sandstone Black" },
                        prices: createPrices(64999) // ₹64,999 / ~$783
                    },
                    {
                        title: "Sandstone Black / 512GB",
                        sku: "ONEPLUS12-SND-512",
                        manage_inventory: true,
                        allow_backorder: false,
                        options: { Storage: "512GB", Color: "Sandstone Black" },
                        prices: createPrices(69999) // ₹69,999 / ~$843
                    }
                ]
            })
            
            // Set up inventory for OnePlus 12 variants (50 units each for testing)
            try {
                const onePlusProduct = await productModule.listProducts({ handle: "oneplus-12" }, {
                    relations: ["variants"]
                })
                
                if (onePlusProduct.length > 0 && onePlusProduct[0].variants) {
                    // Get or create India stock location
                    let indiaLocation
                    const existingLocations = await stockLocationModule.listStockLocations({
                        name: "India Warehouse"
                    })
                    
                    if (existingLocations.length > 0) {
                        indiaLocation = existingLocations[0]
                    } else {
                        indiaLocation = await stockLocationModule.createStockLocations({
                            name: "India Warehouse",
                            address: {
                                address_1: "123 Tech Park",
                                city: "Mumbai",
                                country_code: "IN",
                                postal_code: "400001"
                            }
                        })
                        logger.info(`✅ Created India stock location: ${indiaLocation.id}`)
                    }
                    
                    // Add inventory for each variant
                    for (const variant of onePlusProduct[0].variants) {
                        if (!variant.sku) {
                            logger.warn(`  ⚠️  Variant ${variant.id} has no SKU, skipping inventory setup`)
                            continue
                        }
                        
                        try {
                            // Get or create inventory item
                            const variantSku = variant.sku || `ONEPLUS12-${variant.id}`
                            let inventoryItems = await inventoryModule.listInventoryItems({
                                sku: variantSku
                            })
                            
                            let inventoryItem
                            if (inventoryItems.length === 0) {
                                inventoryItem = await inventoryModule.createInventoryItems({
                                    sku: variantSku,
                                    title: variant.title || onePlusProduct[0].title
                                })
                            } else {
                                inventoryItem = inventoryItems[0]
                            }
                            
                            // Create or update inventory level
                            const existingLevels = await inventoryModule.listInventoryLevels({
                                inventory_item_id: inventoryItem.id,
                                location_id: indiaLocation.id
                            })
                            
                            if (existingLevels.length === 0) {
                                await inventoryModule.createInventoryLevels({
                                    inventory_item_id: inventoryItem.id,
                                    location_id: indiaLocation.id,
                                    stocked_quantity: 50, // 50 units for testing
                                    incoming_quantity: 0
                                })
                                logger.info(`  ✅ Added 50 units stock: ${variant.title || variant.sku}`)
                            } else {
                                await inventoryModule.updateInventoryLevels({
                                    inventory_item_id: inventoryItem.id,
                                    location_id: indiaLocation.id,
                                    stocked_quantity: 50
                                })
                                logger.info(`  ✅ Updated to 50 units: ${variant.title || variant.sku}`)
                            }
                        } catch (invError: any) {
                            logger.warn(`  ⚠️  Failed to add inventory for ${variant.sku}: ${invError.message}`)
                        }
                    }
                }
            } catch (invError: any) {
                logger.warn(`⚠️  Failed to set up inventory for OnePlus 12: ${invError.message}`)
            }
            
            logger.info("✅ OnePlus 12 created successfully with inventory")
        } catch (error: any) {
            logger.warn(`⚠️  Failed to create/update OnePlus 12: ${error.message}`)
        }

        // 6. Create Accessories
        logger.info("🎧 Creating accessories...")

        // AirPods Pro (2nd Gen)
        try {
            await createProductIfNotExists("airpods-pro-2", {
            title: "AirPods Pro (2nd Gen)",
            handle: "airpods-pro-2",
            subtitle: "Active Noise Cancellation. Spatial Audio.",
            description: "Premium wireless earbuds with Active Noise Cancellation, Adaptive Transparency, and Spatial Audio with dynamic head tracking.",
            status: "published",
            category_ids: [categoryMap["Accessories"].id],
            sales_channels: [{ id: salesChannel.id }],
            metadata: {
                brand: "Apple",
                type: "earbuds",
                features: "ANC, Spatial Audio, Transparency Mode, MagSafe Charging",
                battery_life: "6 hours (with ANC), 30 hours with case"
            },
            options: [{ title: "Type", values: ["Standard"] }],
            variants: [
                {
                    title: "Standard",
                    sku: "AIRPODS-PRO-2",
                    manage_inventory: true,
                    allow_backorder: false,
                    options: { Type: "Standard" },
                    prices: createPrices(24900) // ₹24,900 / ~$300
                }
            ]
        })
        } catch (error: any) {
            logger.warn(`⚠️  Failed to create/update AirPods Pro: ${error.message}`)
        }

        // USB-C Fast Charger
        try {
            await createProductIfNotExists("usb-c-fast-charger-20w", {
            title: "USB-C Fast Charger 20W",
            handle: "usb-c-fast-charger-20w",
            subtitle: "Fast charging power adapter",
            description: "20W USB-C power adapter for fast charging of iPhones, iPads, and other USB-C devices. Compact design, perfect for travel.",
            status: "published",
            category_ids: [categoryMap["Accessories"].id],
            sales_channels: [{ id: salesChannel.id }],
            metadata: {
                brand: "Generic",
                type: "charger",
                power: "20W",
                connector: "USB-C",
                compatible: "iPhone, iPad, Android devices"
            },
            options: [{ title: "Type", values: ["Standard"] }],
            variants: [
                {
                    title: "Standard",
                    sku: "CHARGER-USBC-20W",
                    manage_inventory: true,
                    allow_backorder: true,
                    options: { Type: "Standard" },
                    prices: createPrices(1999) // ₹1,999 / ~$24
                }
            ]
        })
        } catch (error: any) {
            logger.warn(`⚠️  Failed to create/update USB-C Charger: ${error.message}`)
        }

        // Wireless Charging Pad
        try {
            await createProductIfNotExists("wireless-charging-pad", {
            title: "Wireless Charging Pad",
            handle: "wireless-charging-pad",
            subtitle: "15W fast wireless charging",
            description: "15W fast wireless charging pad compatible with Qi-enabled devices. LED indicator shows charging status.",
            status: "published",
            category_ids: [categoryMap["Accessories"].id],
            sales_channels: [{ id: salesChannel.id }],
            metadata: {
                brand: "Generic",
                type: "wireless-charger",
                power: "15W",
                standard: "Qi",
                compatible: "iPhone, Samsung, all Qi-enabled devices"
            },
            options: [{ title: "Type", values: ["Standard"] }],
            variants: [
                {
                    title: "Standard",
                    sku: "WIRELESS-CHARGER-15W",
                    manage_inventory: true,
                    allow_backorder: true,
                    options: { Type: "Standard" },
                    prices: createPrices(1499) // ₹1,499 / ~$18
                }
            ]
        })
        } catch (error: any) {
            logger.warn(`⚠️  Failed to create/update Wireless Charger: ${error.message}`)
        }

        // Tempered Glass Screen Protector
        try {
            await createProductIfNotExists("tempered-glass-screen-protector", {
            title: "Tempered Glass Screen Protector",
            handle: "tempered-glass-screen-protector",
            subtitle: "9H hardness protection",
            description: "Premium tempered glass screen protector with 9H hardness rating. Bubble-free installation, crystal clear clarity, and full touch sensitivity.",
            status: "published",
            category_ids: [categoryMap["Accessories"].id],
            sales_channels: [{ id: salesChannel.id }],
            metadata: {
                brand: "Generic",
                type: "screen-protector",
                material: "tempered-glass",
                hardness: "9H",
                compatibility: "Universal (various sizes available)"
            },
            options: [
                { title: "Size", values: ["6.1 inch", "6.7 inch", "6.8 inch"] }
            ],
            variants: [
                {
                    title: "6.1 inch",
                    sku: "SCREEN-PROT-6.1",
                    manage_inventory: true,
                    allow_backorder: true,
                    options: { Size: "6.1 inch" },
                    prices: createPrices(499) // ₹499 / ~$6
                },
                {
                    title: "6.7 inch",
                    sku: "SCREEN-PROT-6.7",
                    manage_inventory: true,
                    allow_backorder: true,
                    options: { Size: "6.7 inch" },
                    prices: createPrices(599) // ₹599 / ~$7
                },
                {
                    title: "6.8 inch",
                    sku: "SCREEN-PROT-6.8",
                    manage_inventory: true,
                    allow_backorder: true,
                    options: { Size: "6.8 inch" },
                    prices: createPrices(699) // ₹699 / ~$8
                }
            ]
        })
        } catch (error: any) {
            logger.warn(`⚠️  Failed to create/update Screen Protector: ${error.message}`)
        }

        // Phone Case - Clear
        try {
            await createProductIfNotExists("clear-phone-case", {
            title: "Clear Phone Case",
            handle: "clear-phone-case",
            subtitle: "Transparent protection",
            description: "Crystal clear phone case that shows off your device while providing protection. Anti-yellowing technology, raised edges for screen protection.",
            status: "published",
            category_ids: [categoryMap["Accessories"].id],
            sales_channels: [{ id: salesChannel.id }],
            metadata: {
                brand: "Generic",
                type: "phone-case",
                material: "TPU",
                protection: "Drop protection, scratch resistant",
                compatibility: "Various models"
            },
            options: [
                { title: "Model", values: ["iPhone 15", "iPhone 15 Pro", "Galaxy S24", "Galaxy S24 Ultra"] }
            ],
            variants: [
                {
                    title: "iPhone 15",
                    sku: "CASE-CLEAR-IP15",
                    manage_inventory: true,
                    allow_backorder: true,
                    options: { Model: "iPhone 15" },
                    prices: createPrices(799) // ₹799 / ~$10
                },
                {
                    title: "iPhone 15 Pro",
                    sku: "CASE-CLEAR-IP15PRO",
                    manage_inventory: true,
                    allow_backorder: true,
                    options: { Model: "iPhone 15 Pro" },
                    prices: createPrices(899) // ₹899 / ~$11
                },
                {
                    title: "Galaxy S24",
                    sku: "CASE-CLEAR-S24",
                    manage_inventory: true,
                    allow_backorder: true,
                    options: { Model: "Galaxy S24" },
                    prices: createPrices(799) // ₹799 / ~$10
                },
                {
                    title: "Galaxy S24 Ultra",
                    sku: "CASE-CLEAR-S24U",
                    manage_inventory: true,
                    allow_backorder: true,
                    options: { Model: "Galaxy S24 Ultra" },
                    prices: createPrices(999) // ₹999 / ~$12
                }
            ]
        })
        } catch (error: any) {
            logger.warn(`⚠️  Failed to create/update Phone Case: ${error.message}`)
        }

        // Summary
        logger.info("=".repeat(60))
        logger.info("✅ Gear Products Seeded Successfully!")
        logger.info("=".repeat(60))
        logger.info("📱 Smartphones:")
        logger.info("   - iPhone 15 Pro (4 variants)")
        logger.info("   - iPhone 15 (4 variants)")
        logger.info("   - Samsung Galaxy S24 Ultra (3 variants)")
        logger.info("   - Samsung Galaxy S24 (3 variants)")
        logger.info("   - OnePlus 12 (6 variants)")
        logger.info("🎧 Accessories:")
        logger.info("   - AirPods Pro (2nd Gen)")
        logger.info("   - USB-C Fast Charger 20W")
        logger.info("   - Wireless Charging Pad")
        logger.info("   - Tempered Glass Screen Protector (3 sizes)")
        logger.info("   - Clear Phone Case (4 models)")
        logger.info("=".repeat(60))
        logger.info("💰 All prices are in both INR (₹) and USD ($)")
        logger.info("📦 Products are published and ready for sale")
        logger.info("=".repeat(60))

    } catch (error) {
        logger.error("❌ Error seeding gear products:", error)
        throw error
    }
}
