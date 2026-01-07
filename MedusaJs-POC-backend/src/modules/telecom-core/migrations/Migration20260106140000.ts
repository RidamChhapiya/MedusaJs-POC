import { Migration } from "@mikro-orm/migrations"

export class Migration20260106140000 extends Migration {
    async up(): Promise<void> {
        // Add period_month and period_year to usage_counter if they don't exist
        this.addSql(`
      ALTER TABLE "usage_counter" 
      ADD COLUMN IF NOT EXISTS "period_month" integer,
      ADD COLUMN IF NOT EXISTS "period_year" integer;
    `)

        // Add new columns with correct names if they don't exist
        this.addSql(`
      ALTER TABLE "usage_counter" 
      ADD COLUMN IF NOT EXISTS "data_used_mb" integer DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "voice_used_min" integer DEFAULT 0;
    `)
    }

    async down(): Promise<void> {
        this.addSql(`
      ALTER TABLE "usage_counter" 
      DROP COLUMN IF EXISTS "period_month",
      DROP COLUMN IF EXISTS "period_year",
      DROP COLUMN IF EXISTS "data_used_mb",
      DROP COLUMN IF EXISTS "voice_used_min";
    `)
    }
}
