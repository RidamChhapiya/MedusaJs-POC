import { Migration } from "@mikro-orm/migrations"

export class Migration20260108062500 extends Migration {
    async up(): Promise<void> {
        // Drop old check constraint
        this.addSql('alter table "subscription" drop constraint if exists "subscription_status_check";')

        // Add new check constraint with "pending" status
        this.addSql('alter table "subscription" add constraint "subscription_status_check" check ("status" in (\'pending\', \'active\', \'suspended\', \'expired\', \'cancelled\'));')
    }

    async down(): Promise<void> {
        // Revert to old constraint without "pending"
        this.addSql('alter table "subscription" drop constraint if exists "subscription_status_check";')
        this.addSql('alter table "subscription" add constraint "subscription_status_check" check ("status" in (\'active\', \'suspended\', \'expired\', \'cancelled\'));')
    }
}
