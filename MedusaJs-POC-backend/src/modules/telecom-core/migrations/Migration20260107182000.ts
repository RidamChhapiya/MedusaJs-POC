import { Migration } from "@mikro-orm/migrations"

export class Migration20260107182000 extends Migration {
    async up(): Promise<void> {
        // Drop old usage_counter columns that don't match the current model
        this.addSql('alter table "usage_counter" drop column if exists "cycle_month";')
        this.addSql('alter table "usage_counter" drop column if exists "cycle_year";')
        this.addSql('alter table "usage_counter" drop column if exists "billing_period_start";')
        this.addSql('alter table "usage_counter" drop column if exists "billing_period_end";')
        this.addSql('alter table "usage_counter" drop column if exists "data_quota_mb";')
        this.addSql('alter table "usage_counter" drop column if exists "voice_quota_min";')
        this.addSql('alter table "usage_counter" drop column if exists "sms_used";')
        this.addSql('alter table "usage_counter" drop column if exists "sms_quota";')
    }

    async down(): Promise<void> {
        // Restore old columns if needed
        this.addSql('alter table "usage_counter" add column if not exists "cycle_month" integer null;')
        this.addSql('alter table "usage_counter" add column if not exists "cycle_year" integer null;')
        this.addSql('alter table "usage_counter" add column if not exists "billing_period_start" timestamptz null;')
        this.addSql('alter table "usage_counter" add column if not exists "billing_period_end" timestamptz null;')
        this.addSql('alter table "usage_counter" add column if not exists "data_quota_mb" integer null;')
        this.addSql('alter table "usage_counter" add column if not exists "voice_quota_min" integer null;')
        this.addSql('alter table "usage_counter" add column if not exists "sms_used" integer null;')
        this.addSql('alter table "usage_counter" add column if not exists "sms_quota" integer null;')
    }
}
