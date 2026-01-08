import { Migration } from "@mikro-orm/migrations"

export class Migration20260107100000 extends Migration {
    async up(): Promise<void> {
        // Update subscription table to match new model
        this.addSql('alter table "subscription" add column if not exists "plan_id" text;')
        this.addSql('alter table "subscription" add column if not exists "msisdn" text;')
        this.addSql('alter table "subscription" add column if not exists "start_date" timestamptz;')
        this.addSql('alter table "subscription" add column if not exists "end_date" timestamptz;')
        this.addSql('alter table "subscription" add column if not exists "data_balance_mb" integer default 0;')
        this.addSql('alter table "subscription" add column if not exists "voice_balance_min" integer default 0;')
        this.addSql('alter table "subscription" add column if not exists "auto_renew" boolean default false;')

        // Update status enum to include new values
        this.addSql(`
      DO $$ BEGIN
        ALTER TABLE "subscription" 
        DROP CONSTRAINT IF EXISTS "subscription_status_check";
        
        ALTER TABLE "subscription" 
        ADD CONSTRAINT "subscription_status_check" 
        CHECK (status IN ('active', 'suspended', 'expired', 'cancelled', 'barred'));
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `)
    }

    async down(): Promise<void> {
        this.addSql('alter table "subscription" drop column if exists "plan_id";')
        this.addSql('alter table "subscription" drop column if exists "msisdn";')
        this.addSql('alter table "subscription" drop column if exists "start_date";')
        this.addSql('alter table "subscription" drop column if exists "end_date";')
        this.addSql('alter table "subscription" drop column if exists "data_balance_mb";')
        this.addSql('alter table "subscription" drop column if exists "voice_balance_min";')
        this.addSql('alter table "subscription" drop column if exists "auto_renew";')
    }
}
