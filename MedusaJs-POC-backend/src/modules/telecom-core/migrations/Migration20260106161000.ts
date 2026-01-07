import { Migration } from "@mikro-orm/migrations"

export class Migration20260106161000 extends Migration {
    async up(): Promise<void> {
        // Create corporate_account table
        this.addSql(`
      CREATE TABLE "corporate_account" (
        "id" character varying NOT NULL,
        "company_name" character varying NOT NULL,
        "billing_contact_id" character varying NOT NULL,
        "total_subscriptions" integer NOT NULL DEFAULT 0,
        "bulk_discount_percentage" integer NOT NULL DEFAULT 0,
        "centralized_billing" boolean NOT NULL DEFAULT true,
        "payment_terms" character varying NOT NULL DEFAULT 'net-30',
        "status" character varying NOT NULL DEFAULT 'active',
        "metadata" jsonb NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        "deleted_at" timestamp NULL,
        CONSTRAINT "corporate_account_pkey" PRIMARY KEY ("id")
      );
    `)

        // Create corporate_subscription table
        this.addSql(`
      CREATE TABLE "corporate_subscription" (
        "id" character varying NOT NULL,
        "corporate_account_id" character varying NOT NULL,
        "subscription_id" character varying NOT NULL,
        "employee_name" character varying NOT NULL,
        "employee_email" character varying NULL,
        "department" character varying NULL,
        "assigned_date" timestamp NOT NULL,
        "removed_date" timestamp NULL,
        "status" character varying NOT NULL DEFAULT 'active',
        "metadata" jsonb NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        "deleted_at" timestamp NULL,
        CONSTRAINT "corporate_subscription_pkey" PRIMARY KEY ("id")
      );
    `)

        // Create roaming_package table
        this.addSql(`
      CREATE TABLE "roaming_package" (
        "id" character varying NOT NULL,
        "subscription_id" character varying NOT NULL,
        "package_type" character varying NOT NULL,
        "destination_country" character varying NOT NULL,
        "data_quota_mb" integer NOT NULL DEFAULT 0,
        "voice_quota_min" integer NOT NULL DEFAULT 0,
        "price" integer NOT NULL,
        "validity_days" integer NOT NULL,
        "activation_date" timestamp NOT NULL,
        "expiry_date" timestamp NOT NULL,
        "status" character varying NOT NULL DEFAULT 'active',
        "metadata" jsonb NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        "deleted_at" timestamp NULL,
        CONSTRAINT "roaming_package_pkey" PRIMARY KEY ("id")
      );
    `)

        // Create device_insurance table
        this.addSql(`
      CREATE TABLE "device_insurance" (
        "id" character varying NOT NULL,
        "subscription_id" character varying NOT NULL,
        "device_product_id" character varying NOT NULL,
        "coverage_type" character varying NOT NULL,
        "monthly_premium" integer NOT NULL,
        "claim_limit" integer NOT NULL,
        "start_date" timestamp NOT NULL,
        "end_date" timestamp NOT NULL,
        "claims_made" integer NOT NULL DEFAULT 0,
        "last_claim_date" timestamp NULL,
        "status" character varying NOT NULL DEFAULT 'active',
        "metadata" jsonb NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        "deleted_at" timestamp NULL,
        CONSTRAINT "device_insurance_pkey" PRIMARY KEY ("id")
      );
    `)

        // Create indexes
        this.addSql(`CREATE INDEX "corporate_account_company_name_index" ON "corporate_account" ("company_name");`)
        this.addSql(`CREATE INDEX "corporate_subscription_corporate_account_id_index" ON "corporate_subscription" ("corporate_account_id");`)
        this.addSql(`CREATE INDEX "corporate_subscription_subscription_id_index" ON "corporate_subscription" ("subscription_id");`)
        this.addSql(`CREATE INDEX "roaming_package_subscription_id_index" ON "roaming_package" ("subscription_id");`)
        this.addSql(`CREATE INDEX "roaming_package_status_index" ON "roaming_package" ("status");`)
        this.addSql(`CREATE INDEX "device_insurance_subscription_id_index" ON "device_insurance" ("subscription_id");`)
        this.addSql(`CREATE INDEX "device_insurance_status_index" ON "device_insurance" ("status");`)
    }

    async down(): Promise<void> {
        this.addSql(`DROP TABLE IF EXISTS "device_insurance" CASCADE;`)
        this.addSql(`DROP TABLE IF EXISTS "roaming_package" CASCADE;`)
        this.addSql(`DROP TABLE IF EXISTS "corporate_subscription" CASCADE;`)
        this.addSql(`DROP TABLE IF EXISTS "corporate_account" CASCADE;`)
    }
}
