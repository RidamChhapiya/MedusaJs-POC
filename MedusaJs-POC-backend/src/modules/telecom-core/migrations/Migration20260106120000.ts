import { Migration } from "@mikro-orm/migrations"

export class Migration20260106120000 extends Migration {
    async up(): Promise<void> {
        // Drop existing tables if they exist (from previous migration)
        this.addSql(`DROP TABLE IF EXISTS "payment_attempt" CASCADE;`)
        this.addSql(`DROP TABLE IF EXISTS "invoice" CASCADE;`)

        // Create invoice table with numeric columns
        this.addSql(`
      CREATE TABLE "invoice" (
        "id" character varying NOT NULL,
        "customer_id" character varying NOT NULL,
        "subscription_id" character varying NOT NULL,
        "invoice_number" character varying NOT NULL UNIQUE,
        "subtotal" integer NOT NULL,
        "tax_amount" integer NOT NULL DEFAULT 0,
        "total_amount" integer NOT NULL,
        "issue_date" timestamp NOT NULL,
        "due_date" timestamp NOT NULL,
        "paid_date" timestamp NULL,
        "status" character varying NOT NULL DEFAULT 'pending',
        "line_items" jsonb NULL,
        "pdf_url" character varying NULL,
        "payment_method" character varying NULL,
        "payment_reference" character varying NULL,
        "notes" text NULL,
        "metadata" jsonb NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        "deleted_at" timestamp NULL,
        CONSTRAINT "invoice_pkey" PRIMARY KEY ("id")
      );
    `)

        // Create payment_attempt table with numeric columns
        this.addSql(`
      CREATE TABLE "payment_attempt" (
        "id" character varying NOT NULL,
        "subscription_id" character varying NOT NULL,
        "invoice_id" character varying NULL,
        "attempt_number" integer NOT NULL DEFAULT 1,
        "status" character varying NOT NULL DEFAULT 'pending',
        "amount" integer NOT NULL,
        "payment_method" character varying NULL,
        "error_code" character varying NULL,
        "error_message" text NULL,
        "next_retry_date" timestamp NULL,
        "max_retries" integer NOT NULL DEFAULT 3,
        "attempted_at" timestamp NOT NULL,
        "completed_at" timestamp NULL,
        "metadata" jsonb NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        "deleted_at" timestamp NULL,
        CONSTRAINT "payment_attempt_pkey" PRIMARY KEY ("id")
      );
    `)

        // Create indexes
        this.addSql(`CREATE INDEX "invoice_customer_id_index" ON "invoice" ("customer_id");`)
        this.addSql(`CREATE INDEX "invoice_subscription_id_index" ON "invoice" ("subscription_id");`)
        this.addSql(`CREATE INDEX "invoice_status_index" ON "invoice" ("status");`)
        this.addSql(`CREATE INDEX "payment_attempt_subscription_id_index" ON "payment_attempt" ("subscription_id");`)
        this.addSql(`CREATE INDEX "payment_attempt_status_index" ON "payment_attempt" ("status");`)
    }

    async down(): Promise<void> {
        this.addSql(`DROP TABLE IF EXISTS "payment_attempt" CASCADE;`)
        this.addSql(`DROP TABLE IF EXISTS "invoice" CASCADE;`)
    }
}
