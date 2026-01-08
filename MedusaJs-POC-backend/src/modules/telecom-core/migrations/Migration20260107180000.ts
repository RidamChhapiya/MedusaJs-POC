import { Migration } from "@mikro-orm/migrations"

export class Migration20260107180000 extends Migration {
    async up(): Promise<void> {
        // Drop old msisdn_id column as we now use msisdn (phone number string)
        this.addSql('alter table "subscription" drop column if exists "msisdn_id";')
    }

    async down(): Promise<void> {
        // Restore msisdn_id column if needed
        this.addSql('alter table "subscription" add column if not exists "msisdn_id" text null;')
    }
}
