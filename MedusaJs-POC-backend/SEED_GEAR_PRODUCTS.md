# Seed Gear Products

This script seeds the database with comprehensive gear products including smartphones and accessories.

## Products Included

### Smartphones
- **iPhone 15 Pro** - 4 variants (Storage: 128GB/256GB, Colors: Natural/Blue Titanium)
- **iPhone 15** - 4 variants (Storage: 128GB/256GB, Colors: Black/Blue)
- **Samsung Galaxy S24 Ultra** - 3 variants (Storage: 256GB/512GB, Colors: Black/Violet)
- **Samsung Galaxy S24** - 3 variants (Storage: 128GB/256GB, Colors: Black/Violet)

### Accessories
- **AirPods Pro (2nd Gen)** - Premium wireless earbuds
- **USB-C Fast Charger 20W** - Fast charging adapter
- **Wireless Charging Pad** - 15W Qi wireless charger
- **Tempered Glass Screen Protector** - 3 sizes (6.1", 6.7", 6.8")
- **Clear Phone Case** - 4 models (iPhone 15, iPhone 15 Pro, Galaxy S24, Galaxy S24 Ultra)

## Features

✅ All products have prices in **both INR (₹) and USD ($)** currencies  
✅ Products are **published** and ready for sale  
✅ Proper **variants** with options (Storage, Color, Size, Model)  
✅ **Inventory management** enabled (manage_inventory: true)  
✅ **Categories** created: Smartphones, Accessories, Gear  
✅ **Sales channel** assignment to Default Sales Channel  
✅ **Metadata** included for filtering and search  

## Running the Seed Script

### Using Medusa CLI (Recommended)
```bash
cd MedusaJs-POC-backend
npx medusa exec ./src/scripts/seed-gear-products.ts
```

### Alternative: Using npm script
You can also add this to your `package.json` scripts section:
```json
"seed:gear": "medusa exec ./src/scripts/seed-gear-products.ts"
```

Then run:
```bash
npm run seed:gear
```

## Prerequisites

1. **Default Sales Channel** must exist in your Medusa admin
   - If it doesn't exist, create it via Admin UI or API

2. **INR Currency** will be created automatically if it doesn't exist

3. **Database** should be migrated and ready

## Product Structure

Each product includes:
- `title` - Product name
- `handle` - URL-friendly identifier
- `description` - Full product description
- `status: "published"` - Makes products visible in store
- `category_ids` - Links to product categories
- `sales_channels` - Assigns to sales channel
- `metadata` - Additional product information
- `options` - Product options (Storage, Color, etc.)
- `variants` - Product variants with:
  - `title` - Variant name
  - `sku` - Stock keeping unit
  - `manage_inventory: true` - Enables inventory tracking
  - `allow_backorder: false` - Prevents overselling
  - `options` - Variant option values
  - `prices` - Pricing in INR

## Troubleshooting

### "Default Sales Channel not found"
- Create a sales channel named "Default Sales Channel" in Medusa Admin
- Or modify the script to use an existing sales channel name

### Products not showing in storefront
- Verify products have `status: "published"`
- Check sales channel assignment
- Ensure region/currency matches product prices

### Add to cart errors
- Products now have prices in both INR and USD
- Ensure both currencies exist in your Medusa admin
- If errors persist, verify region currency is either INR or USD
- Check browser console for detailed error logs

## Next Steps

After seeding:
1. Verify products appear in storefront
2. Test add to cart functionality
3. Check product detail pages
4. Test variant selection
5. Verify pricing displays correctly
