import { Migration } from "@mikro-orm/migrations"

export class Migration20260106160000 extends Migration {
    async up(): Promise<void> {
        // Create device_contract table
        this.addSql(`
      CREATE TABLE "device_contract" (
        "id" character varying NOT NULL,
        "subscription_id" character varying NOT NULL,
        "device_product_id" character varying NOT NULL,
        "customer_id" character varying NOT NULL,
        "device_price" integer NOT NULL,
        "down_payment" integer NOT NULL DEFAULT 0,
        "installment_amount" integer NOT NULL,
        "installment_count" integer NOT NULL,
        "installments_paid" integer NOT NULL DEFAULT 0,
        "contract_start_date" timestamp NOT NULL,
        "contract_end_date" timestamp NOT NULL,
        "next_payment_date" timestamp NOT NULL,
        "status" character varying NOT NULL DEFAULT 'active',
        "early_termination_fee" integer NOT NULL,
        "metadata" jsonb NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        "deleted_at" timestamp NULL,
        CONSTRAINT "device_contract_pkey" PRIMARY KEY ("id")
      );
    `)

        // Create porting_request table
        this.addSql(`
      CREATE TABLE "porting_request" (
        "id" character varying NOT NULL,
        "customer_id" character varying NOT NULL,
        "msisdn" character varying NOT NULL,
        "donor_operator" character varying NOT NULL,
        "port_type" character varying NOT NULL,
        "status" character varying NOT NULL DEFAULT 'pending',
        "requested_date" timestamp NOT NULL,
        "scheduled_date" timestamp NULL,
        "completed_date" timestamp NULL,
        "rejection_reason" text NULL,
        "metadata" jsonb NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        "deleted_at" timestamp NULL,
        CONSTRAINT "porting_request_pkey" PRIMARY KEY ("id")
      );
    `)

        // Create family_plan table
        this.addSql(`
      CREATE TABLE "family_plan" (
        "id" character varying NOT NULL,
        "primary_subscription_id" character varying NOT NULL,
        "plan_name" character varying NOT NULL,
        "total_data_quota_mb" integer NOT NULL,
        "total_voice_quota_min" integer NOT NULL,
        "shared_data_used_mb" integer NOT NULL DEFAULT 0,
        "shared_voice_used_min" integer NOT NULL DEFAULT 0,
        "max_members" integer NOT NULL DEFAULT 5,
        "current_members" integer NOT NULL DEFAULT 1,
        "status" character varying NOT NULL DEFAULT 'active',
        "metadata" jsonb NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        "deleted_at" timestamp NULL,
        CONSTRAINT "family_plan_pkey" PRIMARY KEY ("id")
      );
    `)

        // Create family_member table
        this.addSql(`
      CREATE TABLE "family_member" (
        "id" character varying NOT NULL,
        "family_plan_id" character varying NOT NULL,
        "subscription_id" character varying NOT NULL,
        "member_type" character varying NOT NULL,
        "joined_date" timestamp NOT NULL,
        "removed_date" timestamp NULL,
        "status" character varying NOT NULL DEFAULT 'active',
        "metadata" jsonb NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        "deleted_at" timestamp NULL,
        CONSTRAINT "family_member_pkey" PRIMARY KEY ("id")
      );
    `)

        // Create indexes
        this.addSql(`CREATE INDEX "device_contract_subscription_id_index" ON "device_contract" ("subscription_id");`)
        this.addSql(`CREATE INDEX "device_contract_status_index" ON "device_contract" ("status");`)
        this.addSql(`CREATE INDEX "porting_request_customer_id_index" ON "porting_request" ("customer_id");`)
        this.addSql(`CREATE INDEX "porting_request_msisdn_index" ON "porting_request" ("msisdn");`)
        this.addSql(`CREATE INDEX "porting_request_status_index" ON "porting_request" ("status");`)
        this.addSql(`CREATE INDEX "family_plan_primary_subscription_id_index" ON "family_plan" ("primary_subscription_id");`)
        this.addSql(`CREATE INDEX "family_member_family_plan_id_index" ON "family_member" ("family_plan_id");`)
        this.addSql(`CREATE INDEX "family_member_subscription_id_index" ON "family_member" ("subscription_id");`)
    }

    async down(): Promise<void> {
        this.addSql(`DROP TABLE IF EXISTS "family_member" CASCADE;`)
        this.addSql(`DROP TABLE IF EXISTS "family_plan" CASCADE;`)
        this.addSql(`DROP TABLE IF EXISTS "porting_request" CASCADE;`)
        this.addSql(`DROP TABLE IF EXISTS "device_contract" CASCADE;`)
    }
}
