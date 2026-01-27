-- SQL Script to add 1000 random MSISDN numbers to inventory
-- Run this in Neon SQL Editor: https://console.neon.tech
-- NOTE: Unique constraint on phone_number is now in place!

-- Generate and insert 1000 random MSISDNs with correct field names
INSERT INTO msisdn_inventory (phone_number, status, tier, region_code, created_at, updated_at)
SELECT 
    -- Generate 10-digit number starting with 9, 8, or 7
    (ARRAY[9, 8, 7])[floor(random() * 3 + 1)::int]::text || 
    lpad(floor(random() * 900000000 + 100000000)::bigint::text, 9, '0') as phone_number,
    'available' as status,
    CASE 
        WHEN random() > 0.8 THEN 'platinum'
        WHEN random() > 0.5 THEN 'gold'
        ELSE 'standard'
    END as tier,
    (ARRAY['NORTH', 'SOUTH', 'EAST', 'WEST', 'CENTRAL'])[floor(random() * 5 + 1)::int] as region_code,
    NOW() as created_at,
    NOW() as updated_at
FROM generate_series(1, 1000)
ON CONFLICT (phone_number) DO NOTHING;

-- Show summary of what was created
SELECT 
    COUNT(*) as total_msisdns,
    COUNT(*) FILTER (WHERE status = 'available') as available,
    COUNT(*) FILTER (WHERE status = 'reserved') as reserved,
    COUNT(*) FILTER (WHERE status = 'active') as active,
    COUNT(*) FILTER (WHERE status = 'cooling_down') as cooling_down,
    COUNT(*) FILTER (WHERE tier = 'standard') as standard,
    COUNT(*) FILTER (WHERE tier = 'gold') as gold,
    COUNT(*) FILTER (WHERE tier = 'platinum') as platinum,
    COUNT(*) FILTER (WHERE region_code = 'NORTH') as north,
    COUNT(*) FILTER (WHERE region_code = 'SOUTH') as south,
    COUNT(*) FILTER (WHERE region_code = 'EAST') as east,
    COUNT(*) FILTER (WHERE region_code = 'WEST') as west,
    COUNT(*) FILTER (WHERE region_code = 'CENTRAL') as central
FROM msisdn_inventory;
