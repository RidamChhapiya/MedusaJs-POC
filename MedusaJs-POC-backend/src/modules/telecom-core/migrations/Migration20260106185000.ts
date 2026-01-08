import { Migration } from "@mikro-orm/migrations"

export class Migration20260106185000 extends Migration {
    async up(): Promise<void> {
        // Make product_id nullable
        this.addSql('alter table "plan_configuration" alter column "product_id" drop not null;')

        // Add new columns
        this.addSql('alter table "plan_configuration" add column if not exists "name" text not null default \'\';')
        this.addSql('alter table "plan_configuration" add column if not exists "description" text;')
        this.addSql('alter table "plan_configuration" add column if not exists "price" integer not null default 0;')
        this.addSql('alter table "plan_configuration" add column if not exists "validity_days" integer not null default 28;')
        this.addSql('alter table "plan_configuration" add column if not exists "is_active" boolean not null default true;')

        // Add default value for type if it doesn't have one
        this.addSql('alter table "plan_configuration" alter column "type" set default \'prepaid\';')

        // Add default value for contract_months
        this.addSql('alter table "plan_configuration" alter column "contract_months" set default 0;')
    }

    async down(): Promise<void> {
        // Reverse the changes
        this.addSql('alter table "plan_configuration" alter column "product_id" set not null;')
        this.addSql('alter table "plan_configuration" drop column if exists "name";')
        this.addSql('alter table "plan_configuration" drop column if exists "description";')
        this.addSql('alter table "plan_configuration" drop column if exists "price";')
        this.addSql('alter table "plan_configuration" drop column if exists "validity_days";')
        this.addSql('alter table "plan_configuration" drop column if exists "is_active";')
        this.addSql('alter table "plan_configuration" alter column "type" drop default;')
        this.addSql('alter table "plan_configuration" alter column "contract_months" drop default;')
    }
}
