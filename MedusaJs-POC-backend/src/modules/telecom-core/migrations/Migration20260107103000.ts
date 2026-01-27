import { Migration } from "@mikro-orm/migrations"

export class Migration20260107103000 extends Migration {
    async up(): Promise<void> {
        // Add product_id column to plan_configuration for product sync
        this.addSql('alter table "plan_configuration" add column if not exists "product_id" text null;')

        // Create index for faster lookups
        this.addSql('create index if not exists "idx_plan_product_id" on "plan_configuration" ("product_id");')
    }

    async down(): Promise<void> {
        this.addSql('drop index if exists "idx_plan_product_id";')
        this.addSql('alter table "plan_configuration" drop column if exists "product_id";')
    }
}
