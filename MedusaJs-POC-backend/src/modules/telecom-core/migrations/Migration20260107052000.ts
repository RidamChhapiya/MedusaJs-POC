import { Migration } from "@mikro-orm/migrations"

export class Migration20260107052000 extends Migration {
    async up(): Promise<void> {
        // Add unique constraint to phone_number field
        this.addSql('alter table "msisdn_inventory" add constraint "msisdn_inventory_phone_number_unique" unique ("phone_number");')
    }

    async down(): Promise<void> {
        // Remove unique constraint
        this.addSql('alter table "msisdn_inventory" drop constraint if exists "msisdn_inventory_phone_number_unique";')
    }
}
