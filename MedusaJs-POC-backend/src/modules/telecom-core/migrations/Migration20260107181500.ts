import { Migration } from "@mikro-orm/migrations"

export class Migration20260107181500 extends Migration {
    async up(): Promise<void> {
        // Drop old subscription columns that are no longer in the model
        this.addSql('alter table "subscription" drop column if exists "current_period_start";')
        this.addSql('alter table "subscription" drop column if exists "current_period_end";')
        this.addSql('alter table "subscription" drop column if exists "renewal_date";')
        this.addSql('alter table "subscription" drop column if exists "billing_day";')
    }

    async down(): Promise<void> {
        // Restore columns if needed
        this.addSql('alter table "subscription" add column if not exists "current_period_start" timestamptz null;')
        this.addSql('alter table "subscription" add column if not exists "current_period_end" timestamptz null;')
        this.addSql('alter table "subscription" add column if not exists "renewal_date" timestamptz null;')
        this.addSql('alter table "subscription" add column if not exists "billing_day" integer null;')
    }
}
