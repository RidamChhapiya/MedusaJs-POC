-- Update existing subscriptions to populate msisdn field from msisdn_id
-- This script fixes the N/A phone number issue in User Analytics

-- First, let's check if we need to update the subscription table structure
DO $$
BEGIN
    -- Check if msisdn column exists, if not the migration hasn't run yet
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscription' AND column_name = 'msisdn'
    ) THEN
        RAISE NOTICE 'Migration not yet applied. Run: npx medusa db:migrate';
    ELSE
        -- Update subscriptions to populate msisdn from msisdn_inventory
        UPDATE subscription s
        SET msisdn = (
            SELECT phone_number 
            FROM msisdn_inventory m 
            WHERE m.id = s.msisdn_id
        )
        WHERE s.msisdn_id IS NOT NULL 
        AND (s.msisdn IS NULL OR s.msisdn = '');
        
        RAISE NOTICE 'Updated % subscriptions with phone numbers', (
            SELECT COUNT(*) FROM subscription WHERE msisdn IS NOT NULL
        );
    END IF;
END $$;

-- Show summary
SELECT 
    COUNT(*) as total_subscriptions,
    COUNT(msisdn) as with_phone_number,
    COUNT(*) - COUNT(msisdn) as missing_phone_number
FROM subscription;
