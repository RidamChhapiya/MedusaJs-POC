import { Migration } from "@mikro-orm/migrations"

export class Migration20260107101500 extends Migration {
    async up(): Promise<void> {
        // Add missing timestamp columns to customer_profile
        this.addSql('alter table "customer_profile" add column if not exists "deleted_at" timestamptz null;')

        // Update created_at and updated_at if they don't have defaults
        this.addSql(`
      alter table "customer_profile" 
      alter column "created_at" set default now(),
      alter column "updated_at" set default now();
    `)
    }

    async down(): Promise<void> {
        this.addSql('alter table "customer_profile" drop column if exists "deleted_at";')
    }
}
